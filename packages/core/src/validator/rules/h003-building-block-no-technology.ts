import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h003BuildingBlockNoTechnology: Rule = {
  meta: {
    code: "H003",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Building-block has no 'technology' attribute",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "building-block") continue;
      if (!el.technology) {
        diagnostics.push({
          code: "H003",
          severity: "hint",
          message: `Building-block '${el.id}' has no 'technology' attribute`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
