import type { Rule, Diagnostic } from "../types.ts";
import type {
  DeploymentDiagram,
  DeploymentNode,
  BuildingBlock,
  DiagramArtifact,
  Workspace,
} from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_SOURCE_LINES = 1000;
const MERMAID_ID = "[A-Za-z0-9_-]+";

interface AliasMap {
  bySafeId: Map<string, string>;
  modelIds: Set<string>;
}

interface Declaration {
  id: string;
  modelId: string;
  kind: "group" | "service";
  line: number;
}

function diagnostic(
  diagram: DiagramArtifact,
  message: string,
  line = diagram.loc.line,
): Diagnostic {
  return {
    code: "E010",
    severity: "error",
    message: `Deployment diagram '${diagram.id}': ${message}`,
    file: diagram.loc.file,
    line,
  };
}

function parseAliases(diagram: DeploymentDiagram, diagnostics: Diagnostic[]): AliasMap {
  const bySafeId = new Map<string, string>();
  const modelIds = new Set<string>();
  const value = diagram.aliases.trim();
  if (value === "") return { bySafeId, modelIds };

  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    const equals = trimmed.split("=").length - 1;
    if (equals !== 1) {
      diagnostics.push(diagnostic(diagram, `alias '${trimmed}' must contain exactly one '='`));
      continue;
    }
    const separator = trimmed.indexOf("=");
    const safeId = trimmed.slice(0, separator).trim();
    const modelId = trimmed.slice(separator + 1).trim();
    if (safeId === "" || modelId === "") {
      diagnostics.push(
        diagnostic(diagram, `alias '${trimmed}' must have non-empty safe and model ids`),
      );
      continue;
    }
    if (bySafeId.has(safeId)) {
      diagnostics.push(diagnostic(diagram, `duplicate alias safe id '${safeId}'`));
      continue;
    }
    if (modelIds.has(modelId)) {
      diagnostics.push(diagnostic(diagram, `duplicate alias model id '${modelId}'`));
      continue;
    }
    bySafeId.set(safeId, modelId);
    modelIds.add(modelId);
  }
  return { bySafeId, modelIds };
}

function resolveId(id: string, aliases: AliasMap): string {
  return aliases.bySafeId.get(id) ?? id;
}

function deploymentScope(
  workspace: Workspace,
  index: ReferenceIndex,
  diagram: DeploymentDiagram,
  diagnostics: Diagnostic[],
): Set<string> {
  const deploymentNodes = workspace.elements.filter(
    (element): element is DeploymentNode => element.kind === "deployment-node",
  );
  const roots = diagram.roots;
  if (roots.length === 0) {
    return new Set(deploymentNodes.map((node) => node.id));
  }

  const selected = new Set<string>();
  const children = new Map<string, string[]>();
  for (const node of deploymentNodes) {
    if (!node.parent) continue;
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node.id);
    children.set(node.parent, siblings);
  }

  for (const root of roots) {
    if (selected.has(root)) {
      diagnostics.push(diagnostic(diagram, `duplicate deployment root '${root}'`));
      continue;
    }
    const target = index.byId.get(root);
    if (!target) {
      diagnostics.push(diagnostic(diagram, `unknown deployment root '${root}'`));
      continue;
    }
    if (target.kind !== "deployment-node") {
      diagnostics.push(
        diagnostic(diagram, `deployment root '${root}' must reference a deployment-node`),
      );
      continue;
    }

    const pending = [root];
    while (pending.length > 0) {
      const current = pending.shift()!;
      if (selected.has(current)) continue;
      selected.add(current);
      for (const child of children.get(current) ?? []) pending.push(child);
    }
  }
  return selected;
}

function isBuildingBlockInScope(
  buildingBlock: BuildingBlock,
  deploymentNodes: Map<string, DeploymentNode>,
  scope: Set<string>,
): boolean {
  for (const node of deploymentNodes.values()) {
    if (scope.has(node.id) && node.hosts.includes(buildingBlock.id)) return true;
  }
  return false;
}

function validateMermaidArchitecture(
  diagram: DeploymentDiagram,
  workspace: Workspace,
  index: ReferenceIndex,
  aliases: AliasMap,
  scope: Set<string>,
  diagnostics: Diagnostic[],
): void {
  const source = diagram.source;
  const lines = source.split("\n");
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
    diagnostics.push(diagnostic(diagram, `source exceeds the ${MAX_SOURCE_BYTES} byte limit`));
    return;
  }
  if (lines.length > MAX_SOURCE_LINES) {
    diagnostics.push(diagnostic(diagram, `source exceeds the ${MAX_SOURCE_LINES} line limit`));
    return;
  }

  const firstMeaningful = lines
    .find((line) => line.trim() !== "" && !line.trim().startsWith("```"))
    ?.trim();
  if (firstMeaningful !== "architecture-beta") {
    diagnostics.push(diagnostic(diagram, "expected Mermaid architecture-beta declaration"));
    return;
  }

  const deploymentNodes = new Map(
    workspace.elements
      .filter((element): element is DeploymentNode => element.kind === "deployment-node")
      .map((node) => [node.id, node]),
  );
  const declarations = new Map<string, Declaration>();
  const groupPattern = new RegExp(
    `^group\\s+(${MERMAID_ID})\\(([^)]+)\\)\\[([^\\]]*)\\](?:\\s+in\\s+(${MERMAID_ID}))?\\s*$`,
  );
  const servicePattern = new RegExp(
    `^service\\s+(${MERMAID_ID})\\(([^)]+)\\)\\[([^\\]]*)\\](?:\\s+in\\s+(${MERMAID_ID}))?\\s*$`,
  );
  const edgePattern = new RegExp(
    `^(${MERMAID_ID})(?::${MERMAID_ID})?\\s+(?:<-->|-->|<--|---)\\s+(?:${MERMAID_ID}:)?(${MERMAID_ID})\\s*$`,
  );
  const edgeMarker = /(?:<-->|-->|<--|---)/;

  const resolveDeclaration = (
    id: string,
    expected: "deployment-node" | "building-block",
    line: number,
  ): string | undefined => {
    const modelId = resolveId(id, aliases);
    const target = index.byId.get(modelId);
    if (!target) {
      diagnostics.push(diagnostic(diagram, `unknown ${expected} reference '${id}'`, line));
      return undefined;
    }
    if (target.kind !== expected) {
      diagnostics.push(
        diagnostic(
          diagram,
          `diagram id '${id}' resolves to '${target.kind}', expected '${expected}'`,
          line,
        ),
      );
      return undefined;
    }
    if (expected === "deployment-node" && !scope.has(target.id)) {
      diagnostics.push(
        diagnostic(diagram, `deployment-node '${target.id}' is outside the selected roots`, line),
      );
      return undefined;
    }
    if (
      expected === "building-block" &&
      !isBuildingBlockInScope(target as BuildingBlock, deploymentNodes, scope)
    ) {
      const message =
        diagram.roots.length > 0
          ? `building-block '${target.id}' is outside the selected roots`
          : `building-block '${target.id}' is not mapped to a deployment node`;
      diagnostics.push(diagnostic(diagram, message, line));
      return undefined;
    }
    return target.id;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNumber = diagram.loc.line + i + 1;
    if (line === "" || line.startsWith("%%") || line === "architecture-beta") continue;

    const group = groupPattern.exec(line);
    const service = servicePattern.exec(line);
    if (group || service) {
      const match = group ?? service!;
      const kind = group ? "group" : "service";
      const id = match[1]!;
      if (declarations.has(id)) {
        diagnostics.push(diagnostic(diagram, `duplicate declaration '${id}'`, lineNumber));
        continue;
      }
      const expected = group ? "deployment-node" : "building-block";
      const modelId = resolveDeclaration(id, expected, lineNumber);
      if (modelId) declarations.set(id, { id, modelId, kind, line: lineNumber });
      const parentId = match[4];
      if (parentId && !group) {
        const parent = declarations.get(parentId);
        if (!parent) {
          diagnostics.push(
            diagnostic(
              diagram,
              `service '${id}' is nested in undeclared group '${parentId}'`,
              lineNumber,
            ),
          );
        } else if (parent.kind !== "group") {
          diagnostics.push(
            diagnostic(diagram, `service '${id}' must be nested in a group`, lineNumber),
          );
        }
      } else if (parentId && group) {
        const parent = declarations.get(parentId);
        if (!parent) {
          diagnostics.push(
            diagnostic(
              diagram,
              `group '${id}' is nested in undeclared group '${parentId}'`,
              lineNumber,
            ),
          );
        } else if (parent.kind !== "group") {
          diagnostics.push(
            diagnostic(diagram, `group '${id}' must be nested in a group`, lineNumber),
          );
        }
      }
      continue;
    }

    if (edgeMarker.test(line)) {
      const edge = edgePattern.exec(line);
      if (!edge) {
        diagnostics.push(diagnostic(diagram, "malformed Mermaid architecture edge", lineNumber));
        continue;
      }
      for (const endpoint of [edge[1]!, edge[2]!]) {
        if (!declarations.has(endpoint)) {
          diagnostics.push(
            diagnostic(diagram, `edge references undeclared endpoint '${endpoint}'`, lineNumber),
          );
        }
      }
    }
  }
}

export const e010DeploymentDiagramValidation: Rule = {
  meta: {
    code: "E010",
    severity: "error",
    type: "problem",
    docs: {
      description: "Deployment diagram metadata, model references, or bounded notation is invalid",
      rationale:
        "Deployment diagrams are scoped views over the structured deployment model. Explicit metadata and bounded notation validation keep diagram source from becoming an untyped second architecture model.",
      arc42Chapter: 7,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagrams = workspace.diagrams ?? [];
    const deploymentDiagrams = diagrams.filter(
      (diagram): diagram is DeploymentDiagram => diagram.diagramType === "deployment",
    );
    const diagnostics: Diagnostic[] = [];
    const seenIds = new Map<string, DiagramArtifact>();

    for (const diagram of diagrams) {
      const previous = seenIds.get(diagram.id);
      if (
        previous &&
        (previous.diagramType === "deployment" || diagram.diagramType === "deployment")
      ) {
        const deployment = diagram.diagramType === "deployment" ? diagram : previous;
        diagnostics.push(diagnostic(deployment, "duplicate diagram id"));
      }
      seenIds.set(diagram.id, diagram);
    }

    for (const diagram of deploymentDiagrams) {
      if (!diagram.id) diagnostics.push(diagnostic(diagram, "missing required 'id' metadata"));
      if (diagram.view !== "deployment")
        diagnostics.push(diagnostic(diagram, "metadata 'view' must be 'deployment'"));
      if (!diagram.notation)
        diagnostics.push(diagnostic(diagram, "missing required 'notation' metadata"));

      const aliases = parseAliases(diagram, diagnostics);
      for (const modelId of aliases.modelIds) {
        if (!index.byId.has(modelId))
          diagnostics.push(diagnostic(diagram, `alias references unknown model id '${modelId}'`));
      }
      const scope = deploymentScope(workspace, index, diagram, diagnostics);

      if (diagram.notation !== "mermaid-architecture") {
        if (diagram.notation)
          diagnostics.push(diagnostic(diagram, `unsupported notation '${diagram.notation}'`));
        continue;
      }
      validateMermaidArchitecture(diagram, workspace, index, aliases, scope, diagnostics);
    }
    return diagnostics;
  },
};
