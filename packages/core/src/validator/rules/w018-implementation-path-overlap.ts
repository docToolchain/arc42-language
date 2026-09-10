import type { Rule } from "../types.ts";
import { normalizedPathSegments } from "../../path-utils.ts";

function isPrefix(parent: string[], child: string[]): boolean {
  return parent.length < child.length && parent.every((part, index) => part === child[index]);
}

export const w018ImplementationPathOverlap: Rule = {
  meta: {
    code: "W018",
    severity: "warning",
    type: "problem",
    docs: {
      description:
        "Conflicting building-block implementation path claims create ambiguous ownership.",
      rationale:
        "Two building-blocks with the same path compete for ownership of the same code. Nested paths without a parent relationship contradict the model hierarchy. In both cases the path structure should match the element hierarchy.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace, _index, options) {
    if (!options) return [];
    const diagnostics = [];

    const blocks = workspace.elements.filter(
      (element) => element.kind === "building-block" && element.path,
    );
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (a.kind !== "building-block" || b.kind !== "building-block" || !a.path || !b.path)
          continue;
        const pa = normalizedPathSegments(a.path);
        const pb = normalizedPathSegments(b.path);
        if (!pa.length || !pb.length) continue;

        if (pa.join("/") === pb.join("/")) {
          diagnostics.push({
            code: "W018",
            severity: "warning" as const,
            message: `'${a.id}' and '${b.id}' both claim the same implementation path '${a.path}'`,
            file: b.loc.file,
            line: b.loc.line,
          });
          continue;
        }

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
