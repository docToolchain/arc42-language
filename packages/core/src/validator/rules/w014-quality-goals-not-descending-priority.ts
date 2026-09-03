import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

const PRIORITY_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };

/**
 * W014 — Quality goals in a file are not in descending priority order.
 *
 * The recommended order within a chapter 10 file is: high → medium → low.
 * Having a lower-priority goal appear before a higher-priority one is usually
 * an authoring oversight and makes 1.2 summaries misleading.
 */
export const w014QualityGoalsNotDescendingPriority: Rule = {
  meta: {
    code: "W014",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Quality goals are not in descending priority order — high before medium before low",
      rationale:
        "arc42 ch.10 quality goals should be listed with the most important goals first (high → medium → low). Out-of-order goals make the chapter 1 summary misleading and suggest the priority field has been set inconsistently. Reorder the blocks so priorities descend through the file.",
      arc42Chapter: 10,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      let lastRank = Infinity; // highest possible — anything is ≤
      let lastPriority = "";
      let lastLine = 0;

      for (const node of doc.nodes) {
        if (node.kind !== "block" || node.blockType !== "quality-goal") continue;

        const priority = node.attributes["priority"];
        if (!priority) continue; // missing priority is caught by builder as parse error

        const rank = PRIORITY_RANK[priority];
        if (rank === undefined) continue; // invalid priority caught elsewhere

        if (rank > lastRank) {
          // A higher-priority goal appears after a lower-priority one
          diagnostics.push({
            code: "W014",
            severity: "warning",
            message: `Quality goal '${node.attributes["id"] ?? "(no id)"}' has priority '${priority}' but appears after a '${lastPriority}' goal — reorder to high → medium → low`,
            file: doc.filePath,
            line: node.startLine,
          });
        }

        lastRank = rank;
        lastPriority = priority;
        lastLine = node.startLine;
      }
      // lastLine used to silence unused-var warning in strict modes
      void lastLine;
    }

    return diagnostics;
  },
};
