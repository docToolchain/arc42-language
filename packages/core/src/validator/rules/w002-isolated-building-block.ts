import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w002IsolatedBuildingBlock: Rule = {
  meta: {
    code: "W002",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Leaf building-block (with a parent) has no interface on either side — it is isolated",
      rationale: "A leaf building-block nested inside a parent should have at least one interface, otherwise it contributes no visible communication contract to the architecture graph. Root blocks are checked at hint level (H004) because a top-level component may intentionally be connected only through its children.",
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
      // Root blocks (no parent) are checked by H004 at hint level.
      // W002 applies only to leaf blocks (those nested inside a parent).
      if (!el.parent) continue;
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
