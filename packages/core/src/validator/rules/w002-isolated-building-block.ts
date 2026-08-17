import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w002IsolatedBuildingBlock: Rule = {
  meta: {
    code: "W002",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Building-block has no interface on either side — it is isolated",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const interfaceIds = new Set<string>();
    for (const el of workspace.elements) {
      if (el.kind !== "interface") continue;
      interfaceIds.add(el.between[0]);
      interfaceIds.add(el.between[1]);
    }
    for (const el of workspace.elements) {
      if (el.kind !== "building-block") continue;
      if (!interfaceIds.has(el.id)) {
        diagnostics.push({
          code: "W002",
          severity: "warning",
          message: `Building-block '${el.id}' has no interface on either side`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
