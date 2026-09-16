import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w029UnknownAttribute: Rule = {
  meta: {
    code: "W029",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Unknown attribute on a block — likely a typo",
      rationale:
        "An attribute that is not part of the block's schema is silently ignored during parsing. " +
        "This most commonly indicates a typo (e.g. 'sevrity' instead of 'severity'). " +
        "The warning lets authors catch these mistakes before the field is silently dropped.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return (workspace.parseWarnings ?? []).map((warn) => ({
      code: "W029",
      severity: "warning" as const,
      message: warn.message,
      file: warn.file,
      line: warn.line,
    }));
  },
};
