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
      rationale:
        "Required attributes like 'id', 'title', 'priority', and 'status' are the minimum structural contract for each block type. Without them the element cannot be built into the model at all — there is nothing to index, reference, or validate. The block is silently dropped from the workspace unless this error is fixed.",
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
