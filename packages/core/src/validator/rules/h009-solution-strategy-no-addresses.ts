import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h009SolutionStrategyNoAddresses: Rule = {
  meta: {
    code: "H009",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Solution strategy does not address any quality goal",
      rationale:
        "The solution strategy should explain how the architecture responds to the quality goals that drive it. A missing link may indicate an incomplete strategy or a quality goal that should be reconsidered.",
      arc42Chapter: 4,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const strategies = workspace.elements.filter((el) => el.kind === "solution-strategy");
    if (strategies.length !== 1 || strategies[0]!.addresses.length > 0) return [];

    const strategy = strategies[0]!;
    return [
      {
        code: "H009",
        severity: "hint",
        message: `Solution strategy '${strategy.id}' does not address any quality goal`,
        file: strategy.loc.file,
        line: strategy.loc.line,
      },
    ];
  },
};
