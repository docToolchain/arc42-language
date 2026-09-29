import { unknownAttributeRule } from "@cli42/lib/rules";
import type { Rule, RuleDocs } from "../types.ts";

export const w029UnknownAttribute: Rule = unknownAttributeRule<RuleDocs>({
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
});
