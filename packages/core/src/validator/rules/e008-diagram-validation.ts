import type { Rule, Diagnostic } from "../types.ts";
import type {
  DiagramArtifact,
  RuntimeScenario,
  SequenceDiagram,
  Workspace,
} from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_SOURCE_LINES = 1000;

interface Participant {
  id: string;
  modelId?: string;
  external: boolean;
  line: number;
}

function diagnostic(
  diagram: DiagramArtifact,
  message: string,
  line = diagram.loc.line,
): Diagnostic {
  return {
    code: "E008",
    severity: "error",
    message: `Diagram '${diagram.id}': ${message}`,
    file: diagram.loc.file,
    line,
  };
}

/**
 * Parse the `aliases` field shared by all diagram types.
 * Format: comma-separated `safe-id=model-id` pairs.
 * Returns a map from safe diagram identifier to model ID, and any parse diagnostics.
 */
function parseAliases(
  diagram: DiagramArtifact,
  raw: string,
): { map: Map<string, string>; diagnostics: Diagnostic[] } {
  const map = new Map<string, string>();
  const diagnostics: Diagnostic[] = [];
  if (!raw || raw.trim() === "") return { map, diagnostics };

  for (const entry of raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0)) {
    const eqIdx = entry.indexOf("=");
    if (eqIdx <= 0 || eqIdx === entry.length - 1) {
      diagnostics.push(
        diagnostic(diagram, `malformed alias '${entry}' — expected safe-id=model-id`),
      );
      continue;
    }
    const safeId = entry.slice(0, eqIdx).trim();
    const modelId = entry.slice(eqIdx + 1).trim();
    if (!safeId || !modelId) {
      diagnostics.push(
        diagnostic(diagram, `malformed alias '${entry}' — expected safe-id=model-id`),
      );
      continue;
    }
    if (map.has(safeId)) {
      diagnostics.push(diagnostic(diagram, `duplicate alias safe-id '${safeId}'`));
      continue;
    }
    map.set(safeId, modelId);
  }
  return { map, diagnostics };
}

function parseMermaidSequence(
  diagram: SequenceDiagram,
  index: ReferenceIndex,
  scenario: RuntimeScenario,
  aliasMap: Map<string, string>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const source = diagram.source;
  const lines = source.split("\n");

  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
    diagnostics.push(diagnostic(diagram, `source exceeds the ${MAX_SOURCE_BYTES} byte limit`));
    return diagnostics;
  }
  if (lines.length > MAX_SOURCE_LINES) {
    diagnostics.push(diagnostic(diagram, `source exceeds the ${MAX_SOURCE_LINES} line limit`));
    return diagnostics;
  }

  const firstMeaningful = lines
    .find((line) => line.trim() !== "" && !line.trim().startsWith("```"))
    ?.trim();
  if (firstMeaningful !== "sequenceDiagram") {
    diagnostics.push(diagnostic(diagram, "expected Mermaid sequenceDiagram declaration"));
    return diagnostics;
  }

  const participants = new Map<string, Participant>();
  const messageEndpoints: Array<{ from: string; to: string; line: number }> = [];
  const declarationPattern =
    /^(actor|participant|boundary|control|entity|database|collections|queue)\s+([^\s]+)(?:\s+as\s+(.+))?\s*$/;
  // Supported message arrows cover the common Mermaid forms, including async
  // and cross-endpoint variants. Other Mermaid constructs remain opaque text
  // in this deliberately bounded validator.
  const messagePattern =
    /^\s*([^\s:]+?)\s*(?:-->>|->>|--x|-x|--\)|-\)|-->|->|--)([+-]?)([^\s:]+)\s*:/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNumber = diagram.loc.line + i + 1;
    if (line === "" || line.startsWith("%%") || line === "sequenceDiagram") continue;

    const declaration = declarationPattern.exec(line);
    if (declaration) {
      const id = declaration[2]!;
      if (participants.has(id)) {
        diagnostics.push(diagnostic(diagram, `duplicate participant '${id}'`, lineNumber));
        continue;
      }

      // Resolve via explicit alias map first, then try the ID directly as a model ID.
      const modelId = aliasMap.get(id) ?? id;
      const target = index.byId.get(modelId);
      const external = declaration[1] === "actor";
      if (target && target.kind !== "building-block" && target.kind !== "actor") {
        diagnostics.push(
          diagnostic(
            diagram,
            `participant '${id}' resolves to non-architectural element '${target.kind}'`,
            lineNumber,
          ),
        );
      }
      if (!target && !external) {
        diagnostics.push(diagnostic(diagram, `unknown participant '${id}'`, lineNumber));
      }
      if (target?.kind === "building-block" && !scenario.involves.includes(target.id)) {
        diagnostics.push(
          diagnostic(
            diagram,
            `building-block participant '${target.id}' is not listed in scenario '${scenario.id}' involves`,
            lineNumber,
          ),
        );
      }
      participants.set(id, {
        id,
        modelId: target?.kind === "building-block" ? target.id : undefined,
        external,
        line: lineNumber,
      });
      continue;
    }

    const message = messagePattern.exec(line);
    if (message) {
      messageEndpoints.push({ from: message[1]!, to: message[3]!, line: lineNumber });
    }
  }

  for (const endpoint of messageEndpoints) {
    for (const id of [endpoint.from, endpoint.to]) {
      if (!participants.has(id)) {
        diagnostics.push(
          diagnostic(diagram, `message references undeclared participant '${id}'`, endpoint.line),
        );
      }
    }
  }

  return diagnostics;
}

export const e008DiagramValidation: Rule = {
  meta: {
    code: "E008",
    severity: "error",
    type: "problem",
    docs: {
      description: "Diagram artifact is malformed, unsupported, or inconsistent with its scenario",
      rationale:
        "Explicitly associated diagrams are architecture artifacts. Their source is treated as untrusted text and checked with bounded, notation-specific parsing so malformed diagrams cannot abort unrelated validation.",
      arc42Chapter: 6,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagrams = workspace.diagrams ?? [];
    const diagnostics: Diagnostic[] = [];
    const scenarios = new Map(
      workspace.elements
        .filter((el): el is RuntimeScenario => el.kind === "runtime-scenario")
        .map((el) => [el.id, el]),
    );
    const seenIds = new Set<string>();

    for (const diagram of diagrams) {
      if (diagram.diagramType === "deployment") continue;
      if (seenIds.has(diagram.id)) {
        diagnostics.push(diagnostic(diagram, "duplicate diagram id"));
        continue;
      }
      seenIds.add(diagram.id);

      if (diagram.diagramType !== "sequence") {
        diagnostics.push(diagnostic(diagram, `unsupported notation '${diagram.notation}'`));
        continue;
      }

      const scenario = scenarios.get(diagram.scenario);
      if (!scenario) {
        diagnostics.push(diagnostic(diagram, `unknown scenario '${diagram.scenario}'`));
        continue;
      }

      const { map: aliasMap, diagnostics: aliasDiagnostics } = parseAliases(
        diagram,
        diagram.aliases,
      );
      diagnostics.push(...aliasDiagnostics);
      if (aliasDiagnostics.length > 0) continue;

      diagnostics.push(...parseMermaidSequence(diagram, index, scenario, aliasMap));
    }

    return diagnostics;
  },
};
