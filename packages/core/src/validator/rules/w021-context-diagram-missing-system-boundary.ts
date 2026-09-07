import type { Rule, Diagnostic } from "../types.ts";
import type { ContextDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

/**
 * W021 — Context diagram is missing a system boundary subgraph.
 *
 * A system context diagram should visually distinguish the system under
 * description from its external actors and systems. In Mermaid graph TD,
 * the system boundary is expressed as a `subgraph` grouping the building
 * blocks that belong to the system.
 *
 * Without a subgraph boundary, readers cannot tell which nodes are "inside"
 * the system and which are external actors — the core purpose of the context
 * diagram is lost.
 */
export const w021ContextDiagramMissingSystemBoundary: Rule = {
  meta: {
    code: "W021",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Context diagram is missing a system boundary — add a subgraph to distinguish the system from external actors",
      rationale:
        "The primary purpose of a system context diagram is to show what is inside the system vs what is outside. A Mermaid subgraph groups the internal building blocks and makes the system boundary explicit.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "context") continue;
      if (!diagram.source || diagram.source.trim() === "") continue;

      if (!/\bsubgraph\b/.test(diagram.source)) {
        diagnostics.push({
          code: "W021",
          severity: "warning",
          message: `Context diagram '${(diagram as ContextDiagram).id}' has no system boundary — add a subgraph to distinguish the system from external actors`,
          file: diagram.loc.file,
          line: diagram.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
