import { multipleBlocksUnderHeadingRule } from "@cli42/lib/rules";
import type { Rule, RuleDocs } from "../types.ts";

/**
 * W005 — A heading section contains more than one block.
 *
 * The convention is one block per sub-chapter: each arc42 element gets its own
 * heading with prose and a single block beneath it. Multiple blocks under one
 * heading is a signal that the section should be split into sub-sections.
 */
export const w005MultipleBlocksUnderHeading: Rule = multipleBlocksUnderHeadingRule<RuleDocs>({
  code: "W005",
  severity: "warning",
  type: "suggestion",
  docs: {
    description:
      "Heading section contains more than one block — split into separate sub-sections (one block per heading)",
    rationale:
      "One block per heading section is the structural convention: each arc42 element gets its own sub-chapter with a heading, prose, and a block as its structured summary. Packing multiple blocks under one heading loses the per-element narrative context — readers cannot tell which prose describes which element. It also makes the document harder to navigate and reference by section.",
    arc42Chapter: 0,
    recommended: true,
  },
});
