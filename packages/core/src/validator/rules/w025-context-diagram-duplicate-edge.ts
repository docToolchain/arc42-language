import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { checkDuplicateEdges } from "./duplicate-edge-check.ts";

/**
 * W025 — A context diagram contains duplicate edges.
 *
 * When the same interface id appears as an edge label more than once in a
 * context diagram, one occurrence is redundant. This is typically a
 * copy-paste mistake and makes the diagram visually noisy without adding
 * information.
 */
export const w025ContextDiagramDuplicateEdge: Rule = {
  meta: {
    code: "W025",
    severity: "warning",
    type: "problem",
    docs: {
      description:
        "A context diagram contains a duplicate edge — the same interface id (or from→to pair) appears more than once",
      rationale:
        "Duplicate edges add visual noise without conveying additional information. They are almost always copy-paste mistakes. Each interface should appear at most once as an edge in any given context diagram.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return checkDuplicateEdges(workspace.diagrams, "context", "W025");
  },
};
