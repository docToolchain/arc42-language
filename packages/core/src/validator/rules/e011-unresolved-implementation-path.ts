import type { Rule } from "../types.ts";
import { resolveAuthoredPath, resolveRepositoryRoot } from "../../repository-root.ts";

export const e011UnresolvedImplementationPath: Rule = {
  meta: {
    code: "E011",
    severity: "error",
    type: "problem",
    docs: {
      description: "An implementation path must resolve to a file or directory in the repository.",
      rationale: "Broken artifact links make the architecture model inconsistent with source code.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace, _index, options) {
    if (!options) return [];
    const root = resolveRepositoryRoot(workspace, options);
    return workspace.elements.flatMap((element) => {
      if (
        (element.kind !== "building-block" && element.kind !== "interface") ||
        element.path === undefined
      ) {
        return [];
      }
      if (resolveAuthoredPath(root, element.path)) return [];
      return [
        {
          code: "E011",
          severity: "error" as const,
          message: `Implementation path '${element.path}' for ${element.kind} '${element.id}' cannot be resolved from repository root`,
          file: element.loc.file,
          line: element.loc.line,
        },
      ];
    });
  },
};
