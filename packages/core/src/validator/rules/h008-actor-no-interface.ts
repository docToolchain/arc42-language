import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h008ActorNoInterface: Rule = {
  meta: {
    code: "H008",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Actor has no required interface",
      rationale:
        "Every actor must declare at least one required interface so its interaction with the system is explicit.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "actor") continue;
      if (!el.requires || el.requires.length === 0) {
        diagnostics.push({
          code: "H008",
          severity: "hint",
          message: `Actor '${el.id}' has no required interface — declare at least one interface in requires`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
