import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w007TooManyQualityGoals: Rule = {
  meta: {
    code: "W007",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Workspace has more than 5 high-priority quality goals — arc42 recommends 3–5",
      rationale:
        "arc42 chapter 10 recommends 3–5 high-priority quality goals. More than 5 makes it difficult to prioritise and compare them — everything becomes equally important, which means nothing is prioritised. Consider consolidating or removing goals that are not genuinely architecture-driving, or lowering their priority.",
      arc42Chapter: 10,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const highGoals = workspace.elements.filter(
      (el) => el.kind === "quality-goal" && el.priority === "high",
    );
    if (highGoals.length <= 5) return [];
    // Report at the first high-priority quality goal to give a file/line anchor.
    return [
      {
        code: "W007",
        severity: "warning",
        message: `Workspace has ${highGoals.length} high-priority quality goals — arc42 recommends 3–5; more than 5 makes prioritisation harder (chapter 10)`,
        file: highGoals[0]!.loc.file,
        line: highGoals[0]!.loc.line,
      },
    ];
  },
};
