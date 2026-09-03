import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w006TooFewQualityGoals: Rule = {
  meta: {
    code: "W006",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Workspace has fewer than 3 high-priority quality goals — arc42 recommends 3–5",
      rationale:
        "arc42 chapter 10 recommends capturing 3–5 high-priority quality goals to make the most important non-functional requirements explicit and comparable. Fewer than 3 high-priority goals usually means either the goals have not been elicited yet or some are buried in prose without a machine-readable block.",
      arc42Chapter: 10,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const highGoals = workspace.elements.filter(
      (el) => el.kind === "quality-goal" && el.priority === "high",
    );
    // Zero high-priority goals is a distinct gap. W006 intentionally fires only for 1–2
    // high-priority goals because that signals elicitation is in progress. Zero goals is
    // flagged differently (users are expected to notice the absence via arc42 get --type quality-goal).
    if (highGoals.length === 0 || highGoals.length >= 3) return [];
    return [
      {
        code: "W006",
        severity: "warning",
        message: `Workspace has only ${highGoals.length} high-priority quality goal(s) — arc42 recommends 3–5 (chapter 10)`,
        file: highGoals[0]!.loc.file,
        line: highGoals[0]!.loc.line,
      },
    ];
  },
};
