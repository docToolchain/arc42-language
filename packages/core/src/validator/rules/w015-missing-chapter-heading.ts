import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import path from "node:path";

/**
 * W015 — A numbered arc42 chapter document is missing a correct h1 heading.
 *
 * Each file named `NN-*.arc42.md` (where NN is 01–12) must start with a
 * level-1 heading whose text matches the official EN or DE chapter title for
 * that chapter number. Files without a numeric prefix are silently skipped.
 */

/** Accepted h1 titles per chapter number (case-insensitive comparison). */
const CHAPTER_TITLES: ReadonlyMap<number, readonly string[]> = new Map([
  [1, ["introduction and goals", "einführung und ziele"]],
  [2, ["architecture constraints", "randbedingungen"]],
  [3, ["system scope and context", "systemabgrenzung und kontext"]],
  [4, ["solution strategy", "lösungsstrategie"]],
  [5, ["building block view", "building blocks", "bausteinsicht"]],
  [6, ["runtime view", "laufzeitsicht"]],
  [7, ["deployment view", "verteilungssicht"]],
  [8, ["cross-cutting concepts", "crosscutting concepts", "querschnittliche konzepte"]],
  [9, ["architecture decisions", "architekturentscheidungen"]],
  [10, ["quality requirements", "qualitätsanforderungen"]],
  [11, ["risks and technical debt", "risiken und technische schulden"]],
  [12, ["glossary", "glossar"]],
]);

/** Format an accepted-titles list for use in diagnostic messages. */
function formatAccepted(titles: readonly string[]): string {
  return titles.map((t) => `"${t}"`).join(", ");
}

/** Extract the chapter number from a filename like "06-runtime-view.arc42.md". */
function chapterNumberFromFile(filePath: string): number | null {
  const base = path.basename(filePath);
  if (!base.endsWith(".arc42.md")) return null;
  const match = /^(\d{2})-/.exec(base);
  if (!match) return null;
  const n = parseInt(match[1]!, 10);
  return CHAPTER_TITLES.has(n) ? n : null;
}

export const w015MissingChapterHeading: Rule = {
  meta: {
    code: "W015",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Chapter document is missing a correct arc42 h1 heading — the first heading must be a level-1 heading with the official chapter title (EN or DE)",
      rationale:
        "Each arc42 chapter document should open with a recognizable chapter title so that readers, tooling, and renderers can orient themselves immediately. A missing or mis-titled h1 breaks navigability and may indicate the file is assigned to the wrong chapter slot.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      const chapterNum = chapterNumberFromFile(doc.filePath);
      if (chapterNum === null) continue; // not a numbered chapter file — skip

      const accepted = CHAPTER_TITLES.get(chapterNum)!;

      // Find the first heading node in the document
      const firstHeading = doc.nodes.find((n) => n.kind === "heading");

      if (!firstHeading) {
        // No heading at all
        diagnostics.push({
          code: "W015",
          severity: "warning",
          message: `Chapter ${chapterNum} document has no h1 heading — expected one of: ${formatAccepted(accepted)}`,
          file: doc.filePath,
          line: 1,
        });
        continue;
      }

      if (firstHeading.level !== 1) {
        // First heading exists but is not h1
        diagnostics.push({
          code: "W015",
          severity: "warning",
          message: `Chapter ${chapterNum} document's first heading is h${firstHeading.level}, expected h1 with title matching: ${formatAccepted(accepted)}`,
          file: doc.filePath,
          line: firstHeading.line,
        });
        continue;
      }

      // First heading is h1 — validate its title
      const actual = firstHeading.text.trim().toLowerCase();
      if (!accepted.includes(actual)) {
        diagnostics.push({
          code: "W015",
          severity: "warning",
          message: `Chapter ${chapterNum} h1 heading "${firstHeading.text}" is not a recognized arc42 chapter title — expected one of: ${formatAccepted(accepted)}`,
          file: doc.filePath,
          line: firstHeading.line,
        });
      }
    }

    return diagnostics;
  },
};
