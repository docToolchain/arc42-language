import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h001DecisionNoAddresses: Rule = {
  meta: {
    code: "H001",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Decision does not address any quality goal",
      arc42Chapter: 9,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "decision") continue;
      if (el.addresses.length === 0) {
        diagnostics.push({
          code: "H001",
          severity: "hint",
          message: `Decision '${el.id}' does not address any quality goal`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
