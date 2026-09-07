import type { Rule, Diagnostic } from "../types.ts";
import type {
  BuildingBlock,
  BuildingBlockDiagram,
  Interface,
  Workspace,
} from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { extractMermaidIds } from "../mermaid-utils.ts";

function diagnostic(diagram: BuildingBlockDiagram, message: string): Diagnostic {
  return {
    code: "E013",
    severity: "error",
    message: `Building-block diagram '${diagram.id}': ${message}`,
    file: diagram.loc.file,
    line: diagram.loc.line,
  };
}

/**
 * E013 — Building-block diagram structural validation.
 *
 * Checks that ids referenced in the Mermaid source of a building-block diagram
 * correspond to actual building blocks or interfaces in the workspace model.
 * An id that appears in the diagram but has no matching model element is an error —
 * the diagram is structurally inconsistent with the model.
 *
 * Note: this uses a conservative token-matching approach. Only tokens that exactly
 * match a known building-block id or interface id in the model are checked. Unknown
 * tokens that don't match any model element are flagged.
 */
export const e013BuildingBlockDiagramValidation: Rule = {
  meta: {
    code: "E013",
    severity: "error",
    type: "problem",
    docs: {
      description: "Building-block diagram references ids that do not exist in the model",
      rationale:
        "Building-block diagrams are views over the structured model. Node and edge ids must correspond to actual building blocks or interfaces so the diagram stays consistent with the architecture.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const buildingBlockIds = new Set(
      workspace.elements
        .filter((e): e is BuildingBlock => e.kind === "building-block")
        .map((e) => e.id),
    );
    const interfaceIds = new Set(
      workspace.elements.filter((e): e is Interface => e.kind === "interface").map((e) => e.id),
    );
    const knownIds = new Set([...buildingBlockIds, ...interfaceIds]);

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "building-block") continue;
      if (!diagram.source || diagram.source.trim() === "") continue;

      const sourceIds = extractMermaidIds(diagram.source);

      for (const id of sourceIds) {
        // Only flag ids that look like they could be model ids (contain a hyphen,
        // which is the arc42 id convention) but don't match any known element.
        // This avoids false positives on Mermaid label text and other tokens.
        if (id.includes("-") && !knownIds.has(id)) {
          diagnostics.push(
            diagnostic(
              diagram as BuildingBlockDiagram,
              `references unknown id '${id}' — not a building-block or interface in the model`,
            ),
          );
        }
      }
    }

    return diagnostics;
  },
};
