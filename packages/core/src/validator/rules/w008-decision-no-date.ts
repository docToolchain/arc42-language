import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w008DecisionNoDate: Rule = {
  meta: {
    code: "W008",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Architecture decision has no date",
      rationale:
        "A dated decision creates an auditable trail — readers can reconstruct the timeline of architectural choices and correlate them with project milestones. An undated decision cannot be placed in context and is harder to assess for staleness (see W003). Every decision should have a date in ISO 8601 format (YYYY-MM-DD).",
      arc42Chapter: 9,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "decision") continue;
      if (!el.date) {
        diagnostics.push({
          code: "W008",
          severity: "warning",
          message: `Decision '${el.id}' has no date — decisions should be dated for traceability (chapter 9)`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
