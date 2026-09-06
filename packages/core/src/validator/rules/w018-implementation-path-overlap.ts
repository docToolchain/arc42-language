import type { Rule } from "../types.ts";
import { normalizedPath, resolveRepositoryRoot } from "../../repository-root.ts";

function isPrefix(parent: string[], child: string[]): boolean {
  return parent.length < child.length && parent.every((part, index) => part === child[index]);
}

export const w018ImplementationPathOverlap: Rule = {
  meta: {
    code: "W018",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Overlapping building-block implementation paths should follow model hierarchy.",
      rationale:
        "A path hierarchy that disagrees with the architecture hierarchy can make ownership ambiguous.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace, _index, options) {
    if (!options) return [];
    const root = resolveRepositoryRoot(workspace, options);
    const blocks = workspace.elements.filter(
      (element) => element.kind === "building-block" && element.path,
    );
    const diagnostics = [];
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (a.kind !== "building-block" || b.kind !== "building-block" || !a.path || !b.path)
          continue;
        const pa = normalizedPath(root, a.path);
        const pb = normalizedPath(root, b.path);
        if (!pa || !pb || pa.join("/") === pb.join("/")) continue;
        const nested = isPrefix(pa, pb) || isPrefix(pb, pa);
        if (!nested) continue;
        const parent = pa.length < pb.length ? a : b;
        const child = parent === a ? b : a;
        if (child.parent !== parent.id) {
          diagnostics.push({
            code: "W018",
            severity: "warning" as const,
            message: `Implementation paths for '${a.id}' and '${b.id}' overlap without a matching building-block parent relationship`,
            file: child.loc.file,
            line: child.loc.line,
          });
        }
      }
    }
    return diagnostics;
  },
};
