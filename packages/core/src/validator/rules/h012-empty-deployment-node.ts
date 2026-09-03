import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h012EmptyDeploymentNode: Rule = {
  meta: {
    code: "H012",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Leaf deployment-node hosts no building-block",
      rationale:
        "A leaf deployment node without hosted software may be an accidental omission. Nodes with deployment-node children are intentional grouping or environment nodes and are therefore exempt.",
      arc42Chapter: 7,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    if (!workspace.elements.some((element) => element.kind === "deployment-node")) return [];

    const childIds = new Set(
      workspace.elements
        .filter(
          (element): element is Extract<typeof element, { kind: "deployment-node" }> =>
            element.kind === "deployment-node" && element.parent !== undefined,
        )
        .map((element) => element.parent!),
    );

    return workspace.elements.flatMap((element): Diagnostic[] => {
      if (element.kind !== "deployment-node") return [];
      if (element.hosts.length > 0 || childIds.has(element.id)) return [];
      return [
        {
          code: "H012",
          severity: "hint",
          message: `Leaf deployment-node '${element.id}' hosts no building-block`,
          file: element.loc.file,
          line: element.loc.line,
        },
      ];
    });
  },
};
