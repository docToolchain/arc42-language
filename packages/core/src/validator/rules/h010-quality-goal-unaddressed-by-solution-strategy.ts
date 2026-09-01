import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h010QualityGoalUnaddressedBySolutionStrategy: Rule = {
  meta: {
    code: "H010",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Quality goal is not addressed by the solution strategy",
      rationale:
        "Every important quality goal should be reflected in the architecture-wide solution strategy. A decision link alone is not enough: decisions record individual choices, while chapter 4 explains the overarching approach.",
      arc42Chapter: 1,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    return workspace.elements
      .filter((el) => el.kind === "quality-goal")
      .filter(
        (el) =>
          !(index.refsTo.get(el.id) ?? []).some((id) => {
            return index.byId.get(id)?.kind === "solution-strategy";
          }),
      )
      .map((el) => ({
        code: "H010",
        severity: "hint" as const,
        message: `Quality goal '${el.id}' is not addressed by the solution strategy`,
        file: el.loc.file,
        line: el.loc.line,
      }));
  },
};
