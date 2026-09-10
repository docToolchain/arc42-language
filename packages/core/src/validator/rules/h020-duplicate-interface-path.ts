import type { Rule } from "../types.ts";
import { normalizedPathSegments } from "../../path-utils.ts";

export const h020DuplicateInterfacePath: Rule = {
  meta: {
    code: "H020",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Multiple interfaces point to the same implementation path.",
      rationale:
        "Two interfaces sharing a path is not necessarily wrong — different consumers may document distinct contracts on the same module entry point. However, it is worth verifying that each interface represents a genuinely distinct contract and is not a duplicate or misplaced element.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace, _index, options) {
    if (!options) return [];

    const interfaces = workspace.elements.filter(
      (element) => element.kind === "interface" && element.path,
    );

    const byPath = new Map<
      string,
      Array<{ id: string; path: string; loc: { file: string; line: number } }>
    >();
    for (const iface of interfaces) {
      if (iface.kind !== "interface" || !iface.path) continue;
      const key = normalizedPathSegments(iface.path).join("/");
      const group = byPath.get(key) ?? [];
      group.push({ id: iface.id, path: iface.path, loc: iface.loc });
      byPath.set(key, group);
    }

    const diagnostics = [];
    for (const group of byPath.values()) {
      if (group.length < 2) continue;
      const ids = group.map((i) => `'${i.id}'`).join(", ");
      const sharedPath = group[0]!.path;
      for (const iface of group.slice(1)) {
        diagnostics.push({
          code: "H020",
          severity: "hint" as const,
          message: `Interfaces ${ids} all point to the same implementation path '${sharedPath}' — verify each represents a distinct contract`,
          file: iface.loc.file,
          line: iface.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
