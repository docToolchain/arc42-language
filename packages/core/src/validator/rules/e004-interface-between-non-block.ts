import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e004InterfaceBetweenNonBlock: Rule = {
  meta: {
    code: "E004",
    severity: "error",
    type: "problem",
    docs: {
      description: "interface.between must reference building-blocks only",
      rationale: "An interface models a communication channel between two building-blocks. Referencing a quality-goal, concept, or decision in 'between' is a category error — those element types have no deployment boundary and cannot participate in a runtime interface. Allowing it would corrupt the building-block graph.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "interface") continue;
      for (const refId of el.between) {
        const target = index.byId.get(refId);
        if (target && target.kind !== "building-block") {
          diagnostics.push({
            code: "E004",
            severity: "error",
            message: `interface '${el.id}' references '${refId}' which is not a building-block (is '${target.kind}')`,
            file: el.loc.file,
            line: el.loc.line,
          });
        }
      }
    }
    return diagnostics;
  },
};
