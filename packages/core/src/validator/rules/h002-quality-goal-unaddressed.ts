import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h002QualityGoalUnaddressed: Rule = {
  meta: {
    code: "H002",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Quality goal is not addressed by any architecture decision",
      arc42Chapter: 1,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "quality-goal") continue;
      const addressedBy = (index.refsTo.get(el.id) ?? []).filter((id) => {
        return index.byId.get(id)?.kind === "decision";
      });
      if (addressedBy.length === 0) {
        diagnostics.push({
          code: "H002",
          severity: "hint",
          message: `Quality goal '${el.id}' is not addressed by any decision`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
