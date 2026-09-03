# Development Plan: arc42-language (feat/validate-chapter-h1-heading branch)

*Generated on 2026-09-03 by Vibe Feature MCP*
*Workflow: [tdd](https://codemcp.github.io/workflows/workflows/tdd)*

## Goal

Add rule **W015** that validates each `.arc42.md` document has a correct `h1` chapter heading
matching a known arc42 chapter title (EN or DE). The rule fires when the h1 is missing,
wrong level, or contains an unrecognized title.

## Key Decisions

1. **Rule code: W015** — next available warning slot after W014.
2. **Severity: warning** — a wrong/missing h1 doesn't break tooling, but breaks document structure.
3. **Title matching: case-insensitive, per-chapter allow-list (EN + DE)** — derive the chapter
   number from the file name prefix (`01-`, `02-`, ...) so only the correct chapter's titles are
   accepted. Files without a numeric prefix are skipped (no diagnostic).
4. **Chapter title mapping** (from official arc42 template EN + DE sources):

   | # | EN title(s) | DE title(s) |
   |---|-------------|-------------|
   | 1 | Introduction and Goals | Einführung und Ziele |
   | 2 | Architecture Constraints | Randbedingungen |
   | 3 | System Scope and Context | Systemabgrenzung und Kontext |
   | 4 | Solution Strategy | Lösungsstrategie |
   | 5 | Building Block View, Building Blocks | Bausteinsicht |
   | 6 | Runtime View | Laufzeitsicht |
   | 7 | Deployment View | Verteilungssicht |
   | 8 | Cross-cutting Concepts, Crosscutting Concepts | Querschnittliche Konzepte |
   | 9 | Architecture Decisions | Architekturentscheidungen |
   | 10 | Quality Requirements | Qualitätsanforderungen |
   | 11 | Risks and Technical Debt | Risiken und technische Schulden |
   | 12 | Glossary | Glossar |

   The project's own docs use slightly different phrasing ("Building Blocks", "Architecture
   Constraints", "System Scope and Context", "Cross-cutting Concepts") so those variants are
   included in the allow-list.

5. **Bilingual acceptance** — EN and DE titles are equally valid. The project is English but arc42
   users may write in German. Both languages are accepted without penalty.
6. **No diagnostic for files without a numeric prefix** — these are treated as non-chapter files.
6. **Multiple h1 headings** — warn on the second and subsequent h1 headings (W015 with a
   "multiple h1" message).
7. **Content before first heading** — not reported by W015 (W004 already covers blocks without
   prose; general prose-before-heading is a separate concern not in scope).
8. **Rule operates on `workspace.documents` (AST level)** — same as W004/W005, not on elements.
   The chapter number is extracted from `doc.filePath` using a regex on the filename.

## Notes

- The official arc42 template repository (github.com/arc42/arc42-template) is the authoritative
  source for DE chapter titles.
- The project already uses `##`-level headings for elements/scenarios inside each chapter
  document, consistent with the arc42 convention that `h1` = chapter, `h2` = element.
- File naming convention in this project: `NN-slug.arc42.md` where `NN` is `01`–`12`.
  The `discoverFiles` function finds all `.arc42.md` files recursively.
- The `__fixtures__/mini-arch/` files don't use numeric prefixes
  (`building-blocks.arc42.md` etc.) — these will be silently skipped by W015.

## Explore
### Tasks
- [x] Read issue #8 requirements
- [x] Read existing W004/W005 rules to understand AST-level rule structure
- [x] Examine `HeadingNode` type (has `level` and `text` fields)
- [x] Check official arc42 chapter titles in EN and DE
- [x] Identify chapter-number-from-filename strategy
- [x] Decide on rule code, severity, and matching strategy

### Completed
- [x] Created development plan file

## Red
### Tasks
- [ ] Write failing tests for W015:
  - Missing h1 (starts with ##) → diagnostic
  - Correct h1 + h2 → no diagnostic
  - Multiple h1s → diagnostic on second
  - Wrong h1 title (not in allow-list for that chapter) → diagnostic
  - File without numeric prefix → no diagnostic
  - German h1 title → no diagnostic

### Completed
- [x] Wrote 11 W015 tests in `packages/core/tests/validator.test.ts`
- [x] Confirmed 4 tests fail for the right reason (rule not yet registered)
- [x] Confirmed "NOT emitted" and "all titles" tests pass trivially (no rule = no diagnostics)
- [x] Pre-existing `renderer.test.ts` failure is unrelated to W015

## Green
### Tasks
- [x] Implement `w015-missing-chapter-heading.ts`
- [x] Register in `rules/index.ts`

### Completed
- [x] Created `packages/core/src/validator/rules/w015-missing-chapter-heading.ts`
  - Chapter number extracted from filename via `/^(\d{2})-/` regex + `.arc42.md` suffix check
  - Per-chapter allow-list of accepted EN+DE titles (case-insensitive `toLowerCase` comparison)
  - Three diagnostics paths: no heading found → line 1; first heading not h1; h1 title not accepted
  - Files without numeric prefix or not ending in `.arc42.md` silently skipped
- [x] Registered `w015MissingChapterHeading` in `rules/index.ts` (Warnings section)
- [x] All 11 W015 tests pass; pre-existing `renderer.test.ts` failure is unrelated

## Refactor
### Tasks
- [x] Extract chapter title map into a shared constant if reusable
- [x] Ensure rule description and rationale are complete for `arc42 rules` output

### Completed
- [x] `CHAPTER_TITLES` is module-local; no other rule needs it — no shared extraction needed
- [x] Extracted `formatAccepted()` helper to eliminate the repeated `.map().join()` inline expression across three diagnostic messages
- [x] Removed redundant `|| firstHeading.kind !== "heading"` guard — `Array.find` already narrows to a heading node
- [x] `description` and `rationale` in `meta.docs` are complete and consistent with other rules' style

## Done
### Tasks
- [x] All acceptance criteria from issue #8 pass
- [x] No regressions in existing tests

### Completed
- [x] Committed all changes (commit `8365031`)
- [x] Pushed branch `feat/validate-chapter-h1-heading`
- [x] PR created: https://github.com/mrsimpson/arc42-language/pull/12


---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
