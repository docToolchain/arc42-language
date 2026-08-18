import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h007RiskUnaddressed: Rule = {
  meta: {
    code: "H007",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Risk is not addressed by any architecture decision",
      rationale: "Risks identified in arc42 chapter 11 should be connected to the architectural decisions that mitigate them. Without this link, the relationship between risks and the decisions made to address them is implicit at best. Linking risks to decisions via 'addresses' makes the mitigation strategy traceable and reviewable.",
      arc42Chapter: 11,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "risk") continue;
      const referencedBy = index.refsTo.get(el.id) ?? [];
      const addressedByDecision = referencedBy.some((id) => index.byId.get(id)?.kind === "decision");
      if (!addressedByDecision) {
        diagnostics.push({
          code: "H007",
          severity: "hint",
          message: `Risk '${el.id}' is not addressed by any decision — risks should be mitigated through documented decisions (chapter 11 → chapter 9)`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
