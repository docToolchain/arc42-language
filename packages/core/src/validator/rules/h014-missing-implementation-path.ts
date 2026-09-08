import type { Rule, Diagnostic } from "../types.ts";

export const h014MissingImplementationPath: Rule = {
  meta: {
    code: "H014",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Implementation artifacts should be linked from building blocks and interfaces.",
      rationale: "Artifact links make the architecture model traceable to the source repository.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace, _index, options) {
    // Direct rule callers without a validation context intentionally opt out of path checks.
    if (!options) return [];
    return workspace.elements.flatMap((element): Diagnostic[] => {
      if (element.kind !== "building-block" && element.kind !== "interface") return [];
      if (element.path === undefined) {
        return [
          {
            code: "H014",
            severity: "hint",
            message: `${element.kind} '${element.id}' has no implementation path`,
            file: element.loc.file,
            line: element.loc.line,
          },
        ];
      }
      return [];
    });
  },
};
