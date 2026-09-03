import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w009RiskNoMitigation: Rule = {
  meta: {
    code: "W009",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Risk has no mitigation strategy",
      rationale:
        "Identifying a risk without documenting a mitigation strategy is only half the work. arc42 chapter 11 expects risks to be paired with how they are addressed — even if the mitigation is 'accepted without action'. An undocumented mitigation leaves the team without guidance on what to do if the risk materialises.",
      arc42Chapter: 11,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "risk") continue;
      if (!el.mitigation) {
        diagnostics.push({
          code: "W009",
          severity: "warning",
          message: `Risk '${el.id}' has no mitigation strategy — document how this risk is addressed (chapter 11)`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
