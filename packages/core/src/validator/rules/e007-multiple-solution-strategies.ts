import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

/** The chapter-4 solution strategy is an architecture-wide singleton. */
export const e007MultipleSolutionStrategies: Rule = {
  meta: {
    code: "E007",
    severity: "error",
    type: "problem",
    docs: {
      description: "More than one solution strategy is defined",
      rationale:
        "Arc42 chapter 4 describes one coherent strategy for the whole architecture. Multiple solution-strategy blocks make the architecture graph ambiguous and incorrectly turn prose subsections into separate strategy entities.",
      arc42Chapter: 4,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const strategies = workspace.elements.filter((el) => el.kind === "solution-strategy");
    return strategies.slice(1).map(
      (strategy) =>
        ({
          code: "E007",
          severity: "error" as const,
          message: `Only one solution-strategy block is allowed per workspace (duplicate '${strategy.id}')`,
          file: strategy.loc.file,
          line: strategy.loc.line,
        }) satisfies Diagnostic,
    );
  },
};
