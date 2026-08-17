import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e002UnresolvedReference: Rule = {
  meta: {
    code: "E002",
    severity: "error",
    type: "problem",
    docs: {
      description: "Unresolved reference — all referenced ids must exist in the workspace",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      const refs = index.refsFrom.get(el.id) ?? [];
      for (const ref of refs) {
        if (!index.byId.has(ref)) {
          diagnostics.push({
            code: "E002",
            severity: "error",
            message: `Unresolved reference '${ref}' in element '${el.id}'`,
            file: el.loc.file,
            line: el.loc.line,
          });
        }
      }
    }
    return diagnostics;
  },
};
