import type { Rule, Diagnostic } from "../types.ts";
import type { Actor, BuildingBlock, ContextDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { extractMermaidIds } from "../mermaid-utils.ts";

function diagnostic(diagram: ContextDiagram, message: string): Diagnostic {
  return {
    code: "E014",
    severity: "error",
    message: `Context diagram '${diagram.id}': ${message}`,
    file: diagram.loc.file,
    line: diagram.loc.line,
  };
}

/**
 * E014 — Context diagram structural validation.
 *
 * Checks that ids referenced in the Mermaid source of a context diagram
 * correspond to actual actors or building blocks in the workspace model.
 */
export const e014ContextDiagramValidation: Rule = {
  meta: {
    code: "E014",
    severity: "error",
    type: "problem",
    docs: {
      description: "Context diagram references ids that do not exist in the model",
      rationale:
        "Context diagrams are views over the structured model. Node ids must correspond to actual actors or building blocks so the diagram stays consistent with the architecture.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const actorIds = new Set(
      workspace.elements.filter((e): e is Actor => e.kind === "actor").map((e) => e.id),
    );
    const buildingBlockIds = new Set(
      workspace.elements
        .filter((e): e is BuildingBlock => e.kind === "building-block")
        .map((e) => e.id),
    );
    const knownIds = new Set([...actorIds, ...buildingBlockIds]);

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "context") continue;
      if (!diagram.source || diagram.source.trim() === "") continue;

      const sourceIds = extractMermaidIds(diagram.source);

      for (const id of sourceIds) {
        if (id.includes("-") && !knownIds.has(id)) {
          diagnostics.push(
            diagnostic(
              diagram as ContextDiagram,
              `references unknown id '${id}' — not an actor or building-block in the model`,
            ),
          );
        }
      }
    }

    return diagnostics;
  },
};
