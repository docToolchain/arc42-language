import type { Rule } from "../types.ts";

function pathIsKnown(path: string, knownPaths: string[]): boolean {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  return knownPaths.some((known) => {
    const candidate = known.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
    return candidate === normalized || candidate.startsWith(`${normalized}/`);
  });
}

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
    const knownPaths = options.pathEvidence?.knownPaths ?? [];
    return workspace.elements.flatMap((element) => {
      if (
        (element.kind !== "building-block" && element.kind !== "interface") ||
        element.path === undefined
      ) {
        return [];
      }
      if (pathIsKnown(element.path, knownPaths)) return [];
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
