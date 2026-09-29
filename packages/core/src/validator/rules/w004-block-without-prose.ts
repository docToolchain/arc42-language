import { blockWithoutProseRule } from "@cli42/lib/rules";
import type { Rule, RuleDocs } from "../types.ts";

/**
 * W004 — A block has no prose between it and the preceding heading (or start of file).
 *
 * Every block should be introduced by at least one prose paragraph that describes
 * the element's purpose, responsibilities, or rationale. A "naked" block with no
 * narrative context makes the document machine-readable only.
 */
export const w004BlockWithoutProse: Rule = blockWithoutProseRule<RuleDocs>({
  code: "W004",
  severity: "warning",
  type: "suggestion",
  docs: {
    description:
      "Block has no prose introduction — every block should be preceded by narrative text within its section",
    rationale:
      "The arc42 DSL is human-readable first. A block without prose is machine-readable only — it records structured metadata but shares no understanding of why the element exists, what it does, or what tradeoffs were made. The convention is: write the explanation first, then the block as its machine-readable summary. This keeps the document useful to human readers and reviewers, not just tooling.",
    arc42Chapter: 0,
    recommended: true,
  },
});
