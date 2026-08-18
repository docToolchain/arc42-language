import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e006SupersededDecisionNoSupersedes: Rule = {
  meta: {
    code: "E006",
    severity: "error",
    type: "problem",
    docs: {
      description: "Decision with status 'superseded' is missing the 'supersedes' attribute",
      rationale: "A superseded decision must point to the decision that replaces it. Without the 'supersedes' attribute, the replacement chain is broken and readers cannot follow the evolution of an architectural decision. This makes the history of decisions untrustworthy.",
      arc42Chapter: 9,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "decision" || el.status !== "superseded") continue;
      if (!el.supersedes) {
        diagnostics.push({
          code: "E006",
          severity: "error",
          message: `Decision '${el.id}' has status 'superseded' but is missing required attribute 'supersedes'`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
