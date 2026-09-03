import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w006TooFewQualityGoals: Rule = {
  meta: {
    code: "W006",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Workspace has fewer than 3 quality goals — arc42 recommends 3–5",
      rationale:
        "arc42 chapter 1 recommends capturing 3–5 quality goals to make the most important non-functional requirements explicit and comparable. Fewer than 3 goals usually means either the goals have not been elicited yet or some are buried in prose without a machine-readable block.",
      arc42Chapter: 1,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const goals = workspace.elements.filter((el) => el.kind === "quality-goal");
    // Zero goals is a distinct gap covered at the project level (a workspace with no quality-goal
    // blocks at all will also never trigger H002 targets). W006 intentionally fires only for 1–2
    // goals because that signals elicitation is in progress. Zero goals is flagged differently
    // (users are expected to notice the absence via arc42 get --type quality-goal).
    if (goals.length === 0 || goals.length >= 3) return [];
    return [
      {
        code: "W006",
        severity: "warning",
        message: `Workspace has only ${goals.length} quality goal(s) — arc42 recommends 3–5 (chapter 1)`,
        file: goals[0]!.loc.file,
        line: goals[0]!.loc.line,
      },
    ];
  },
};
