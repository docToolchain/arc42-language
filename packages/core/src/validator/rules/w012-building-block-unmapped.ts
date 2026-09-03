import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w012BuildingBlockUnmapped: Rule = {
  meta: {
    code: "W012",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Leaf building-block is not mapped to a deployment node",
      rationale:
        "When deployment modelling is present, every leaf building-block should be covered by at least one relevant infrastructure node. Composite building-blocks are decomposition containers and do not need a direct deployment mapping.",
      arc42Chapter: 7,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    if (!workspace.elements.some((element) => element.kind === "deployment-node")) return [];

    const mappedBuildingBlocks = new Set<string>();
    for (const node of workspace.elements) {
      if (node.kind !== "deployment-node") continue;
      for (const host of node.hosts) {
        if (index.byId.get(host)?.kind === "building-block") mappedBuildingBlocks.add(host);
      }
    }

    const parentIds = new Set(
      workspace.elements
        .filter(
          (element): element is Extract<typeof element, { kind: "building-block" }> =>
            element.kind === "building-block" && element.parent !== undefined,
        )
        .map((element) => element.parent!),
    );

    return workspace.elements.flatMap((element): Diagnostic[] => {
      if (element.kind !== "building-block") return [];
      if (parentIds.has(element.id) || mappedBuildingBlocks.has(element.id)) return [];
      return [
        {
          code: "W012",
          severity: "warning",
          message: `Leaf building-block '${element.id}' is not mapped to a deployment node`,
          file: element.loc.file,
          line: element.loc.line,
        },
      ];
    });
  },
};
