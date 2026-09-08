import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { checkDuplicateEdges } from "./duplicate-edge-check.ts";

/**
 * W025 — A context diagram contains duplicate edges.
 *
 * When the same labeled edge appears more than once in a context diagram, one
 * occurrence is redundant. A single provider-owned interface may legitimately
 * connect multiple consumers, so the edge endpoints are part of the identity.
 */
export const w025ContextDiagramDuplicateEdge: Rule = {
  meta: {
    code: "W025",
    severity: "warning",
    type: "problem",
    docs: {
      description:
        "A context diagram contains a duplicate edge — the same labeled edge or from→to pair appears more than once",
      rationale:
        "Duplicate edges add visual noise without conveying additional information. The same provider-owned interface may be used by multiple consumers, so only repeated edge endpoints and labels are duplicates.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return checkDuplicateEdges(workspace.diagrams, "context", "W025");
  },
};
