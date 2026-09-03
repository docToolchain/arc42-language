import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h013QualityGoalNoScenario: Rule = {
  meta: {
    code: "H013",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Quality goal has no elaborating quality scenario",
      rationale:
        "Every quality goal should be made concrete and testable through at least one quality scenario in ch.10.2. A goal without a scenario is stated intent but not actionable for architecture evaluation or acceptance testing.",
      arc42Chapter: 10,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    return workspace.elements
      .filter((el) => el.kind === "quality-goal")
      .filter(
        (el) =>
          !(index.refsTo.get(el.id) ?? []).some(
            (id) => index.byId.get(id)?.kind === "quality-scenario",
          ),
      )
      .map((el) => ({
        code: "H013",
        severity: "hint" as const,
        message: `Quality goal '${el.id}' has no elaborating quality scenario`,
        file: el.loc.file,
        line: el.loc.line,
      }));
  },
};
