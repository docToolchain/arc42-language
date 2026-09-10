import type { Rule, Diagnostic } from "../types.ts";

export const h021UncoveredSourcePath: Rule = {
  meta: {
    code: "H021",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "A source path is not claimed by any building-block or interface.",
      rationale:
        "This path shares a parent directory with other paths that are claimed by the architecture model. Sibling paths in the same directory were deliberately modeled, making this gap visible. It likely represents a component or subsystem that was forgotten or intentionally excluded from the model scope.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(_workspace, _index, context) {
    if (!context?.coverage) return [];

    const diagnostics: Diagnostic[] = [];

    for (const uncoveredPath of context.coverage.uncovered) {
      // Find a plausible file to attach the diagnostic to — use the first document
      // in the workspace that lives under a related source path.
      // Since this is a structural issue with no owning element, we use a synthetic location.
      diagnostics.push({
        code: "H021",
        severity: "hint",
        message: `Source path '${uncoveredPath}' is not claimed by any building-block or interface — add a building-block or interface with 'path: ${uncoveredPath}' if it belongs to the system scope`,
        file: uncoveredPath,
        line: 1,
      });
    }

    return diagnostics;
  },
};
