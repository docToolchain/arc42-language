import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e001DuplicateId: Rule = {
  meta: {
    code: "E001",
    severity: "error",
    type: "problem",
    docs: {
      description: "Duplicate element id — each id must be unique across the workspace",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const seen = new Map<string, { file: string; line: number }>();
    for (const el of workspace.elements) {
      const prev = seen.get(el.id);
      if (prev) {
        diagnostics.push({
          code: "E001",
          severity: "error",
          message: `Duplicate id '${el.id}' (first defined at ${prev.file}:${prev.line})`,
          file: el.loc.file,
          line: el.loc.line,
        });
      } else {
        seen.set(el.id, { file: el.loc.file, line: el.loc.line });
      }
    }
    return diagnostics;
  },
};
