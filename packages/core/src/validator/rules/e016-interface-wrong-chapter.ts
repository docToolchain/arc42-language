import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { Diagnostic, Rule } from "../types.ts";
import { basename } from "../../path-utils.ts";

function chapterNumberFromFile(filePath: string): number | null {
  const match = /^(\d{2})-/.exec(basename(filePath));
  if (!match) return null;
  const chapter = Number(match[1]);
  return chapter >= 1 && chapter <= 12 ? chapter : null;
}

/** E016 — Interfaces are chapter 5 elements. */
export const e016InterfaceWrongChapter: Rule = {
  meta: {
    code: "E016",
    severity: "error",
    type: "problem",
    docs: {
      description: "Interface is declared outside the chapter 5 building-block view",
      rationale:
        "Interfaces describe provider-owned building-block contracts. Keeping their definitions in chapter 5 leaves chapter 3 actors to reference the contracts they require.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return workspace.elements.flatMap((element): Diagnostic[] => {
      if (element.kind !== "interface") return [];
      const chapter = chapterNumberFromFile(element.loc.file);
      if (chapter === null || chapter === 5) return [];
      return [
        {
          code: "E016",
          severity: "error",
          message: `Interface '${element.id}' is declared in chapter ${chapter}; declare it beneath its provider in chapter 5 and reference it through consumer requires`,
          file: element.loc.file,
          line: element.loc.line,
        },
      ];
    });
  },
};
