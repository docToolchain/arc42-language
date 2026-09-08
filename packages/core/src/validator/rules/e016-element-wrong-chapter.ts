import { chapterNumberFromFile } from "../../path-utils.ts";
import { ELEMENT_CHAPTER, type Element, type Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { Diagnostic, Rule } from "../types.ts";

function describeElement(element: Element): string {
  return `${element.kind} '${element.id}'`;
}

/**
 * E016 — A typed element is documented in the chapter assigned to its kind.
 *
 * Numbered files define the chapter boundary. Unnumbered documents can be
 * used for snippets and alternate layouts and are intentionally ignored.
 */
export const e016ElementWrongChapter: Rule = {
  meta: {
    code: "E016",
    severity: "error",
    type: "problem",
    docs: {
      description: "Typed element is documented in a chapter different from its canonical chapter",
      rationale:
        "Each arc42 element kind has a canonical chapter. Enforcing that assignment keeps the architecture model consistent with the chapter structure and prevents definitions from being separated from their intended view.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const element of workspace.elements) {
      const actualChapter = chapterNumberFromFile(element.loc.file);
      if (actualChapter === null) continue;

      const expectedChapter = ELEMENT_CHAPTER[element.kind];
      if (actualChapter === expectedChapter) continue;

      diagnostics.push({
        code: "E016",
        severity: "error",
        message: `${describeElement(element)} belongs in chapter ${expectedChapter}, but is documented in chapter ${actualChapter}`,
        file: element.loc.file,
        line: element.loc.line,
      });
    }

    return diagnostics;
  },
};
