import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h006ConstraintUnaddressed: Rule = {
  meta: {
    code: "H006",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Constraint is not addressed by any architecture decision",
      rationale: "arc42 chapter 2 constraints should drive architecture decisions. A constraint with no decision addressing it is either ignored or its impact was never made explicit. Linking constraints to decisions via 'addresses' creates an auditable trace from obligation to architectural response.",
      arc42Chapter: 2,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "constraint") continue;
      const referencedBy = index.refsTo.get(el.id) ?? [];
      const addressedByDecision = referencedBy.some((id) => index.byId.get(id)?.kind === "decision");
      if (!addressedByDecision) {
        diagnostics.push({
          code: "H006",
          severity: "hint",
          message: `Constraint '${el.id}' is not addressed by any decision — constraints should drive architecture decisions (chapter 2 → chapter 9)`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
