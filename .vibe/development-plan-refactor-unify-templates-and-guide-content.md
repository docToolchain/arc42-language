# Development Plan: arc42-language (refactor/unify-templates-and-guide-content branch)

*Generated on 2026-09-08 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Define a single ownership model for chapter authoring guidance so `templates/starter/*.arc42.md`
and `arc42 guide chapter <n>` cannot drift or contradict each other.
## Key Decisions
- Reconsidered the initial Markdown-first recommendation: the CLI's typed chapter catalog is already
  the natural canonical source, and the user prefers code-first generation. The preferred direction is
  now one typed chapter definition that drives both `arc42 guide chapter <n>` and the starter-template
  artifact.
- Keep `arc42 explain` authoritative for block schemas and field syntax; chapter definitions own
  chapter-specific prose, structure, examples, operational dependencies, and explain-command hints.
- Do not regex-parse free-form Markdown to recover metadata. If templates remain as checked-in
  artifacts, generate them from the definitions and verify that they are up to date.
- Preserve the current CLI behavior: `guide chapter` remains read-only and `init template` still
  copies twelve `.arc42.md` files. Unification should change ownership, not the user-facing commands.

## Notes
- `packages/cli/src/guide.ts` has a 12-entry `CHAPTERS` catalog with `focus`, `content`,
  `dependencies`, and `commands`, then embeds the corresponding template. The `focus` and `content`
  fields restate the chapter comments/templates in shorter, independently editable wording.
- The templates already contain the detailed chapter purpose, structure, examples, cross-chapter
  references, and typed-block placement rules inside HTML comments. They are copied as the starter
  artifacts by `arc42 init template` and bundled by `packages/cli/vite.config.ts`.
- The guide also duplicates stable titles and filenames (`CHAPTERS.title/file` vs template H1 and
  filename), while the guide's `commands` duplicate the block types demonstrated in templates and
  sometimes omit relevant types (for example chapter 3's interface rule and chapter 6's runtime
  scenario guidance).
- There is already an explicit boundary documented in the earlier migration plan: templates are the
  source for starter content, `arc42 explain` is the source for block syntax, and the guide owns
  orchestration. That was a reasonable boundary for a first implementation, but it assumed Markdown
  was the best authoring surface. The current catalog and guide renderer make a code-first boundary
  equally viable and better aligned with the user's intuition.
- Relevant implementation/test paths: `packages/cli/src/guide.ts`, `packages/cli/src/help.ts`,
  `packages/cli/src/cli.ts`, `packages/cli/vite.config.ts`, and `packages/cli/tests/help.test.ts`.
- The current build copies `templates/starter/*.arc42.md` into `dist/templates`; it has no generation
  step. A code-first design therefore needs either a generation step before packaging or a Vite copy
  plugin that renders definitions into `dist/templates`.
- The package publishes only `dist`, so generated templates do not need to be runtime source files in
  the npm package. In the repository, checked-in generated artifacts would remain useful for review,
  template validation, and discoverability, but must carry generated-file ownership and a freshness
  check to avoid a second editable source.
- The prior objection to code-first was ergonomic rather than architectural: putting long Markdown
  prose in TypeScript can reduce Markdown tooling, preview, and editing quality. This can be mitigated
  with `String.raw` template literals or a small typed chapter renderer, but it is a real trade-off.

## Explore
### Tasks
- [x] Locate the template, guide, dispatch, bundling, help, and test sources.
- [x] Compare all twelve chapter templates with the chapter catalog and identify overlapping facts.
- [x] Inspect history and prior design decisions for the intended template/guide boundary.
- [x] Evaluate source-of-truth alternatives and select a direction for the Plan phase.
- [x] Re-evaluate the Markdown-first recommendation against the user's code-first preference and the
  existing build/package pipeline.

### Completed
- [x] Created development plan file
- [x] Exploration completed without changing production code.
- [x] Found the primary drift risk: chapter-specific `focus`/`content` prose is maintained both in
  `guide.ts` and in each starter template, while the guide prints the template as well.
- [x] Found a secondary drift risk: titles/filenames and explain-command lists are maintained in
  the catalog alongside corresponding template headings/examples.
- [x] Confirmed that code-first generation is feasible, but requires an explicit artifact-generation
  and freshness strategy because the current build only copies static template files.
- [x] Recorded the trade-off: code-first removes semantic drift, while Markdown-first provides a
  better prose-editing surface; the user's preference and existing typed catalog now favor code-first.

## Plan
### Tasks
- [x] Select the canonical model and authoring representation: a typed chapter definition in the CLI
  source, with the full starter document held as a deterministic `String.raw` Markdown value. Keep
  the prose in one place without introducing a bespoke Markdown AST or regex parser.
- [x] Define the chapter data contract: `number`, `title`, and a derived stable filename/slug identify
  the chapter; `dependencies` and explicit `commands` remain operational metadata; `template` is the
  canonical chapter document. Require unique numbers, slugs, and filenames and exactly twelve entries.
- [x] Define guide behavior: remove duplicated `focus` and `content` fields and their output; retain
  title, dependencies, role, authoring rules, explicit commands, and the canonical template. Make
  `guide chapter` render from the in-memory definition so it is read-only and independent of asset
  paths.
- [x] Define artifact generation: add a deterministic generator that writes the twelve canonical
  values to `templates/starter/*.arc42.md`, preserves stable newline/filename ordering, and supports
  a check mode that fails when a checked-in artifact differs from generated output.
- [x] Keep checked-in starter files as generated, reviewable artifacts for repository browsing and
  `arc42 validate --dir templates/starter`; document that they are not hand-edited. Keep the existing
  Vite copy and `init template` behavior, with build/CI invoking generation or freshness checking before
  packaging.
- [x] Specify migration handling for the existing twelve files: copy their complete contents into the
  canonical definitions without semantic edits, then regenerate and compare. Preserve authored
  comments, examples, headings, and trailing-newline behavior unless a test exposes an existing
  inconsistency that must be corrected explicitly.
- [x] Specify tests for definition invariants, generated-artifact freshness, guide output, all twelve
  filenames/titles, and generated-template validation. Add a package-build/init-template smoke check so
  missing generated assets cannot pass unnoticed.
- [x] Specify verification: focused CLI tests, repository checks/type checks, generation freshness,
  `arc42 validate --dir templates/starter`, package build, and a clean temporary `init template` run.

### Completed
- Revised recommendation for planning: make a typed code definition the single source of truth and
  generate both guide output and starter-template Markdown from it. Prefer checked-in generated
  templates plus a `generate`/`check` path if repository browsing and template validation are valued;
  otherwise generate directly into `dist/templates` during packaging.
- Alternatives considered: (1) keep both sources and rely on review (rejected: current failure mode),
  (2) Markdown-first with guide metadata beside it (safe and simple, but leaves chapter prose outside
  the code catalog), (3) regex-parse template prose/examples (rejected: brittle and ambiguous), and
  (4) a separate structured manifest (viable, but less direct than making the existing typed catalog
  canonical). Code-first is now preferred, subject to choosing the least awkward Markdown authoring
  representation in the Plan phase.
- Selected `String.raw` Markdown values rather than a structured Markdown renderer for this change.
  The templates are mostly narrative HTML-comment guidance and examples; a renderer would add a new
  authoring DSL and could change formatting without solving a user need. A typed renderer remains a
  future option if repeated structural edits make raw literals painful.
- Kept `dependencies` and `commands` as explicit code metadata. They are guide workflow data, not
  chapter prose, and must not be inferred from which block examples happen to occur in a template.
- Kept generated files in `templates/starter/` as checked-in artifacts because the repository documents
  and validates them directly. Generation plus freshness checking makes their ownership unambiguous;
  Vite continues to bundle those artifacts, so `init template` needs no contract change.
- Chosen migration invariant: the first implementation must reproduce the current starter templates
  byte-for-byte apart from intentionally documented generated-file handling. This limits the refactor
  to ownership and avoids silently changing authoring guidance.
- Recorded edge cases for implementation: template literals must preserve Markdown backticks and final
  newlines; generated filenames must be collision-free; guide output must not write files; direct-source
  CLI execution must work without relying on `dist`; build packaging must fail if generated assets are
  stale or absent.
- Implementation adjustment: the existing Markdown files remain the canonical authoring surface for
  the long-form templates. Moving all twelve documents into TypeScript would make the repository harder
  to edit and preview, while the concrete drift found in the guide was the duplicated `focus` and
  `content` prose. The implementation therefore removes that duplication and adds a catalog/artifact
  consistency check (chapter count, unique numbers/files, and title headings) instead of rewriting
  unchanged Markdown through a generator.
- Validation baseline recorded: the existing starter set currently reports four unresolved example
  references in chapter 7 and two diagram warnings. These pre-existing template issues are not caused
  by the catalog refactor and were not silently changed under the byte-preservation constraint.
- Review follow-up: made `check:templates` mandatory in the repository `check` and `build` scripts and
  in the CLI package prebuild path, so catalog/template drift cannot pass normal verification or
  packaging. Updated guide help text to remove the no-longer-existing “chapter focus” claim and added
  regression coverage for that contract.
- Review follow-up: strengthened the checker to require chapter numbers 1–12 and an exact artifact set,
  and wired it into the CLI package `check` and `prepack` lifecycle so direct package verification and
  publishing cannot bypass the consistency gate.
- Final design clarification: do not retain either checked-in starter Markdown files or generated
  `dist/templates` assets. The typed chapter definitions now contain the complete template text. The
  CLI bundle is the only runtime source, `guide chapter` reads the in-memory text, and `init template`
  writes it directly to the requested directory.
- Filename convention is explicit and centralized in `filename(chapter)`: a two-digit chapter number,
  a lowercase hyphen-separated slug, and `.arc42.md` (for example `07-deployment-view.arc42.md`).
  Slugs are metadata, not inferred from prose or titles.
- Architecture-diff review: no arc42 documentation update is necessary. The change remains an internal
  implementation detail of `bb-cli`; the CLI command interface, workspace-adapter boundary, core
  responsibilities, and web hosting contract are unchanged. The existing decision that neutral starter
  templates provide authoring guidance remains true because `init template` still produces them.
- Serve-navigation fix: document labels now render as `<number>: <H1>` using the numeric filename
  prefix and the document's level-one heading. Lower-level headings remain subsection navigation;
  filenames are retained only in URL hashes and fallback labels.

## Code
### Tasks
- [x] Extract the canonical typed chapter definitions, including all template text, and remove duplicated
  guide prose.
- [x] Add a deterministic definition/filename consistency check and expose it as `pnpm run check:templates`.
- [x] Remove Vite template copying and preserve the `init template` user contract while changing its
  implementation to generate files dynamically from the bundled definitions.
- [x] Add tests for catalog cardinality/uniqueness, guide output, and the twelve template heading/file
  identities.
- [x] Run focused tests, full tests, checks, source validation, template consistency, and package build.
- [x] Record the pre-existing starter validation findings rather than changing authored examples during
  this ownership refactor.
- [x] Address independent review findings: enforce template checks during check/build and correct stale
  help text.
- [x] Address re-review findings: enforce direct package check/pack paths and reject extra or incorrectly
  numbered starter artifacts.
- [x] Obtain final independent review; no P1/P2 findings remained and the implementation received a GO
  recommendation.
- [x] Fix serve sidebar document labels to show chapter number plus H1 instead of filename labels, and
  update the browser navigation regression tests.

### Completed
- Removed `focus` and `content` from all chapter metadata and from `guide chapter` output.
- Corrected the chapter 2 catalog title to match the starter heading (`Architecture Constraints`).
- Added `scripts/check-starter-templates.ts`, the root `check:templates` script, and catalog invariant
  tests. The check verifies all twelve files, unique chapter numbers/files, and exact H1 identity.
- Verification passed: full test suite (54 files / 277 tests), repository check, source validation,
  template consistency check, CLI package build, and post-review focused tests/checks.
- Review follow-up passed: template checking is now mandatory in root and CLI package verification;
  guide help no longer advertises removed focus prose; direct package packing and the exact twelve-file
  artifact set are also guarded. Final independent review found no P1/P2 issues.
- Implemented the final dynamic-generation design: migrated all twelve existing template documents into
  `packages/cli/src/chapters.ts`, removed `templates/starter/` and `dist/templates` copying, generated
  filenames from explicit slugs, and made `init template` write definitions directly. Added an
  integration test for generated filenames/content.
- Consolidated the `Chapter` type into the canonical chapter-definition module; no parallel type model
  is needed. Verified the built CLI dynamically creates all twelve files in a temporary directory.
- Final verification after dynamic generation: full suite (54 files / 278 tests), root check, definition
  consistency check, CLI package check/build, root build, and temporary-directory `init template` smoke
  test all passed.
- Serve-navigation verification passed: web build, repository check, and 8 document-navigation Playwright
  tests.
- Starter validation still reports the recorded baseline: 4 errors and 2 warnings in existing example
  guidance content.

## Commit
### Tasks
- [x] Review the final diff and verification results.
- [x] Stage only the dynamic chapter-definition, CLI, test, package, plan, and deleted-template changes.
- [x] Create a conventional commit describing the source-of-truth and dynamic-init change.

### Completed
- Final review confirmed no P1/P2 findings and architecture-diff review found no required documentation
  changes.
- Verification completed before commit: 54 test files / 278 tests, root check, template-definition check,
  CLI check/build, root build, and built-CLI temporary-directory scaffolding smoke test.



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
