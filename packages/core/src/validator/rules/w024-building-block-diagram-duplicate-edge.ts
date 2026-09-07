import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { checkDuplicateEdges } from "./duplicate-edge-check.ts";

/**
 * W024 — A building-block diagram contains duplicate edges.
 *
 * When the same interface id appears as an edge label more than once in a
 * building-block diagram, one occurrence is redundant. This is typically a
 * copy-paste mistake and makes the diagram visually noisy without adding
 * information.
 */
export const w024BuildingBlockDiagramDuplicateEdge: Rule = {
  meta: {
    code: "W024",
    severity: "warning",
    type: "problem",
    docs: {
      description:
        "A building-block diagram contains a duplicate edge — the same interface id (or from→to pair) appears more than once",
      rationale:
        "Duplicate edges add visual noise without conveying additional information. They are almost always copy-paste mistakes. Each interface should appear at most once as an edge in any given building-block diagram.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return checkDuplicateEdges(workspace.diagrams, "building-block", "W024");
  },
};
