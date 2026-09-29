import { parseErrorRule } from "@cli42/lib/rules";
import type { Rule, RuleDocs } from "../types.ts";

export const e005ParseError: Rule = parseErrorRule<RuleDocs>({
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
});
