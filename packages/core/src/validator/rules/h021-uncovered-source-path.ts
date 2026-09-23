import type { Rule, Diagnostic } from "../types.ts";

export const h021UncoveredSourcePath: Rule = {
  meta: {
    code: "H021",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "A source path is not claimed by any building-block or interface.",
      rationale:
        "This path shares a parent directory with other paths that are claimed by the architecture model. Sibling paths in the same directory were deliberately modeled, making this gap visible. It likely represents a component or subsystem that was forgotten or intentionally excluded from the model scope. To suppress for a specific path, add it to a .arc42ignore file in the repository root.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(_workspace, _index, context) {
    if (!context?.coverage) return [];

    const diagnostics: Diagnostic[] = [];
    const ignored = context.coverageIgnore ?? new Set<string>();

    for (const uncoveredPath of context.coverage.uncovered) {
      if (ignored.has(uncoveredPath)) continue;

      diagnostics.push({
        code: "H021",
        severity: "hint",
        message: `Source path '${uncoveredPath}' is not claimed by any building-block or interface — add a building-block or interface with 'path: ${uncoveredPath}' if it belongs to the system scope, or add '${uncoveredPath}' to .arc42ignore to suppress this hint`,
        file: uncoveredPath,
        line: 1,
      });
    }

    return diagnostics;
  },
};
