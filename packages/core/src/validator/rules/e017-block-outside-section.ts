import { blockOutsideSectionRule } from "@cli42/lib/rules";
import type { Rule, RuleDocs } from "../types.ts";

/**
 * E017 — A block is not placed under any heading.
 *
 * Every block belongs to the section opened by the nearest preceding heading.
 * A block above the first heading (or in a document without headings) has no
 * section, so its prose cannot be associated with it — neither by readers nor
 * by tooling such as `arc42 diff`.
 */
export const e017BlockOutsideSection: Rule = blockOutsideSectionRule<RuleDocs>({
  code: "E017",
  severity: "error",
  type: "problem",
  docs: {
    description: "Block is not placed under any heading — move it into a section below a heading",
    rationale:
      "A block is the structured summary of the section it lives in. Without a preceding heading the block has no section: its narrative context is undefined, and tooling that relates prose to blocks (e.g. `arc42 diff`) cannot decide which prose belongs to it.",
    arc42Chapter: 0,
    recommended: true,
  },
});
