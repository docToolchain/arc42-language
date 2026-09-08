import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e015SelfInterfaceRequirement: Rule = {
  meta: {
    code: "E015",
    severity: "error",
    type: "problem",
    docs: {
      description: "Building-block requires an interface it provides itself",
      rationale:
        "A requirement must represent a dependency on another provider, not a self-reference.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const element of workspace.elements) {
      if (element.kind !== "building-block") continue;
      for (const edge of index.interfaceEdges) {
        if (edge.consumer !== element.id || edge.provider !== element.id) continue;
        diagnostics.push({
          code: "E015",
          severity: "error",
          message: `Building-block '${element.id}' requires interface '${edge.interface}' that it provides itself`,
          file: element.loc.file,
          line: element.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
