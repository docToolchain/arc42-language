import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const w003StaleProposedDecision: Rule = {
  meta: {
    code: "W003",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Decision has been in 'proposed' status for more than 90 days",
      arc42Chapter: 9,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const now = Date.now();
    for (const el of workspace.elements) {
      if (el.kind !== "decision" || el.status !== "proposed" || !el.date) continue;
      const d = Date.parse(el.date);
      if (!isNaN(d) && now - d > NINETY_DAYS_MS) {
        diagnostics.push({
          code: "W003",
          severity: "warning",
          message: `Decision '${el.id}' has been 'proposed' for more than 90 days (since ${el.date})`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
