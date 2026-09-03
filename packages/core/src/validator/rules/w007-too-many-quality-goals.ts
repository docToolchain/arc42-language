import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w007TooManyQualityGoals: Rule = {
  meta: {
    code: "W007",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Workspace has more than 5 quality goals — arc42 recommends 3–5",
      rationale:
        "arc42 chapter 1 recommends 3–5 quality goals. More than 5 makes it difficult to prioritise and compare them — everything becomes equally important, which means nothing is prioritised. Consider consolidating or removing goals that are not genuinely architecture-driving.",
      arc42Chapter: 1,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const goals = workspace.elements.filter((el) => el.kind === "quality-goal");
    if (goals.length <= 5) return [];
    // Report at the first quality goal to give a file/line anchor.
    return [
      {
        code: "W007",
        severity: "warning",
        message: `Workspace has ${goals.length} quality goals — arc42 recommends 3–5; more than 5 makes prioritisation harder (chapter 1)`,
        file: goals[0]!.loc.file,
        line: goals[0]!.loc.line,
      },
    ];
  },
};
