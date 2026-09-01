import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w011RuntimeScenarioNoInvolves: Rule = {
  meta: {
    code: "W011",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Runtime scenario has no participating building blocks",
      rationale:
        "A runtime scenario without involved building blocks cannot be connected to the architecture model. Add the building-block ids that participate in the flow, even when the detailed steps remain prose or a diagram.",
      arc42Chapter: 6,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return workspace.elements.flatMap((el): Diagnostic[] => {
      if (el.kind !== "runtime-scenario" || el.involves.length > 0) return [];
      return [
        {
          code: "W011",
          severity: "warning",
          message: `Runtime scenario '${el.id}' has no involved building blocks — add an 'involves' list (chapter 6)`,
          file: el.loc.file,
          line: el.loc.line,
        },
      ];
    });
  },
};
