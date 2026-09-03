import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e003CircularParent: Rule = {
  meta: {
    code: "E003",
    severity: "error",
    type: "problem",
    docs: {
      description: "Circular parent reference — building-block parent chain must be acyclic",
      rationale:
        "The parent hierarchy reconstructs the arc42 building-block decomposition tree. A cycle (A is parent of B, B is parent of A) means there is no valid root and the tree cannot be rendered or navigated. It is always a modelling error.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "building-block" || !el.parent) continue;
      const visited = new Set<string>();
      let current: string | undefined = el.id;
      while (current !== undefined) {
        if (visited.has(current)) {
          diagnostics.push({
            code: "E003",
            severity: "error",
            message: `Circular parent reference detected involving '${current}'`,
            file: el.loc.file,
            line: el.loc.line,
          });
          break;
        }
        visited.add(current);
        const node = index.byId.get(current);
        current = node?.kind === "building-block" ? node.parent : undefined;
      }
    }
    return diagnostics;
  },
};
