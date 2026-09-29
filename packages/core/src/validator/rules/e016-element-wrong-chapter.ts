import { elementWrongChapterRule } from "@cli42/lib/rules";
import { ELEMENT_CHAPTER } from "../../model/types.ts";
import { chapterNumberFromFile } from "../../path-utils.ts";
import type { BlockType } from "../../ast.ts";
import type { Rule, RuleDocs } from "../types.ts";

/**
 * E016 — A typed element is documented in the chapter assigned to its kind.
 *
 * Numbered files define the chapter boundary. Unnumbered documents can be
 * used for snippets and alternate layouts and are intentionally ignored.
 */
export const e016ElementWrongChapter: Rule = elementWrongChapterRule<BlockType, RuleDocs>(
  {
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
  { chapters: ELEMENT_CHAPTER, chapterOfFile: chapterNumberFromFile },
);
