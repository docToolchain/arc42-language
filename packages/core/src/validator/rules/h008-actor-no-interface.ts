import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h008ActorNoInterface: Rule = {
  meta: {
    code: "H008",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Actor is not connected to any interface",
      rationale:
        "An actor defined in chapter 3 represents an external party that interacts with the system. An actor with no interface connecting it to a building-block is a stub — it names a stakeholder or external system but documents no interaction. Either add an interface to make the interaction explicit, or remove the actor if it is not relevant to the system context.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "actor") continue;
      const referencedBy = index.refsTo.get(el.id) ?? [];
      const hasInterface = referencedBy.some((id) => index.byId.get(id)?.kind === "interface");
      if (!hasInterface) {
        diagnostics.push({
          code: "H008",
          severity: "hint",
          message: `Actor '${el.id}' is not connected to any interface — document how this external party interacts with the system (chapter 3)`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
