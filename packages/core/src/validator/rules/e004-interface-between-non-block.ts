import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e004InterfaceBetweenNonBlock: Rule = {
  meta: {
    code: "E004",
    severity: "error",
    type: "problem",
    docs: {
      description: "interface.provider must reference a building-block",
      rationale:
        "An interface is provided by exactly one building-block. Actors and other element types cannot provide interfaces.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "interface") continue;

      const provider = index.byId.get(el.provider);

      // Only validate when both ends are resolved — E002 covers unresolved refs
      if (provider && provider.kind !== "building-block") {
        diagnostics.push({
          code: "E004",
          severity: "error",
          message: `interface '${el.id}' provider '${el.provider}' must be a building-block (is '${provider.kind}')`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
