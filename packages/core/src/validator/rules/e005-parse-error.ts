import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e005ParseError: Rule = {
  meta: {
    code: "E005",
    severity: "error",
    type: "problem",
    docs: {
      description: "Missing or invalid required attribute — structural parse error in a block",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return workspace.parseErrors.map((pe) => ({
      code: "E005",
      severity: "error" as const,
      message: pe.message,
      file: pe.file,
      line: pe.line,
    }));
  },
};
