import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h011InterfaceNotCoveredByRuntimeScenario: Rule = {
  meta: {
    code: "H011",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Interface is not covered by any runtime scenario",
      rationale:
        "Important interfaces should be exercised by at least one representative Runtime View scenario. This is a documentation hint, not a completeness requirement.",
      arc42Chapter: 6,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const scenarios = workspace.elements.filter((el) => el.kind === "runtime-scenario");

    return workspace.elements.flatMap((el): Diagnostic[] => {
      if (el.kind !== "interface") return [];
      const buildingBlockEndpoints = el.between.filter((id) =>
        workspace.elements.some((target) => target.id === id && target.kind === "building-block"),
      );
      const coveredByOneScenario = scenarios.some((scenario) =>
        buildingBlockEndpoints.every((id) => scenario.involves.includes(id)),
      );
      if (coveredByOneScenario) return [];
      return [
        {
          code: "H011",
          severity: "hint",
          message: `Interface '${el.id}' is not covered by any runtime scenario — document a representative chapter 6 flow`,
          file: el.loc.file,
          line: el.loc.line,
        },
      ];
    });
  },
};
