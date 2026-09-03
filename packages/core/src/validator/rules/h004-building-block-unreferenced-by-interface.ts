import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h004BuildingBlockUnreferencedByInterface: Rule = {
  meta: {
    code: "H004",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Building block is not referenced by any interface",
      rationale:
        "A building block with no interface connecting it to the rest of the system is an island — it either has no collaborators or its collaborations are undocumented. arc42 chapter 5 expects interfaces to make collaboration explicit and verifiable. Leaf blocks (those with a parent) are excluded because they may deliberately have no direct interfaces at the root level.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "building-block") continue;
      // Leaf blocks (those inside a parent) are excluded to avoid false positives
      if (el.parent) continue;
      const referencedBy = index.refsTo.get(el.id) ?? [];
      const hasInterface = referencedBy.some((id) => index.byId.get(id)?.kind === "interface");
      if (!hasInterface) {
        diagnostics.push({
          code: "H004",
          severity: "hint",
          message: `Building block '${el.id}' is not referenced by any interface — consider connecting it or removing it (chapter 5)`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
