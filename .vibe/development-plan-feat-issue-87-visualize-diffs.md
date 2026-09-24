# Development Plan: arc42-language (claude/issue-87-implementation-0gzpja branch)

*Generated on 2026-09-24*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Let an architect reviewing a change understand how it affects the architecture
(issue #87). Visualize architecture changes per chapter (inline and side by side),
between working tree / index / refs, and later as a historical timeline. The
public plan lives in the issue:
https://github.com/docToolchain/arc42-language/issues/87#issuecomment-5822082903

## Key Decisions
- **Semantic, not line-based.** The existing diff (`core/src/diff.ts`, #36) only maps
  git hunks to line ranges; it answers "is this change consistent?" but not "what
  changed?". A new semantic diff over two full `WorkspacePayload`s becomes the single
  engine for CLI lint, JSON output and web visualization.
- **Three layers:** ① snapshot loader (`workspace-fs`, replaces `collectGitDiff`),
  ② `diffWorkspaces(base, head, changes)` (`core`), ③ `lintArchitectureDiff` (`core`,
  renamed from `analyzeArchitectureDiff` because it produces findings).
- **Identity by `id`.** A renamed id is a removal plus an addition. No rename heuristics.
- **Blocks without `id`** are a validation error and never appear in the diff.
- **Blocks outside any heading** are a validation error (E017). Every block therefore
  belongs to a section, and the diff needs no pseudo-section fallback.
- **Scope:** model diff first. Prose changes in a block's section are attached to that
  block (`proseChanged`). Prose-only sections are diffed too, keyed by document +
  heading path; a renamed heading is a removal plus an addition.
- **No workarounds; errors surface noisily.** No fallback parsers, no fallback identity
  keys (`id ?? startLine`), no pseudo-sections, no silently kept stale payloads.
- **"Block changed" = a parsed attribute value changed**, not "a line in the block was
  touched". Intended behaviour change: whitespace/reformat/attribute reordering no
  longer triggers `block-without-prose-change`.
- **Test contract:** `cli/tests/diff-cli.test.ts` (black-box, real git) stays unchanged
  as the regression suite. Unit test assertions stay; only fixtures whose input shape
  changes are adapted.
- **Every phase ships black-box / e2e tests** (CLI spawned against temp workspaces or
  git repos; Playwright for web phases).
- **Prose is compared as text, not via line ranges.** `diffWorkspaces(base, head)` compares
  the whitespace-normalized prose of each section between snapshots, so it needs no git
  hunks at all (refines the issue plan's `diffWorkspaces(base, head, changes)`). Hunks remain
  only for the lint layer's implementation-path hints on code files.
- **Section identity** = file + heading path (+ 1-based occurrence for repeated identical
  paths). A section holding a block in either snapshot is reported through its elements;
  only sections without blocks on both sides appear as prose sections. A document preamble
  (prose before the first heading) is a prose section with an empty heading path.
- **Element `proseChanged`:** both sides → section key or prose differs; added → no base
  section with the same key, or its prose differs; removed → symmetric against head. This
  reproduces the #36 rules (paired deletion accepted, prose left behind reported).
- **Attribute comparison** ignores `id`/`loc`, trims strings and compares lists as sets.
  Diagram `source` ignores trailing whitespace per line.
- **Summary per document**, not per chapter: works for non-numbered files and matches the
  web sidebar, which lists documents.
- **Snapshot paths are repository-relative** on both sides (git and `FileChange` use the same
  convention). `loadWorkspace` keeps absolute paths; the web only uses file names.
- **Known paths are per snapshot side** (commit → `ls-tree`, index/working tree → `ls-files`).
  The old `collectGitDiff` used the HEAD tree as base paths even when the base is the index.
- **Commit ranges:** `a..b` compares two commits, `a...b` uses the merge base (PR view).
  A range with `--staged` is an error.
- **One PR, logically sound commits** (user decision): each commit builds, passes all
  checks and tests, and does one thing (rename / engine switch / dead-code removal / feature /
  docs).
- **Lint API:** `lintArchitectureDiff({ changes, base, head, baseKnownPaths, headKnownPaths })`
  returns `DiffResult` with the `architecture` diff attached, so CLI JSON and web get findings
  and changes from one call. Path hints read interface *elements*, not raw AST blocks.
- **Commits:** Conventional Commits with `## Intent`, `## Key decisions`,
  `## Side effects` body (see `.agents/skills/commit/SKILL.md`).

## Notes
- The base side of today's `collectGitDiff` is always parsed with the sync Markdown
  parser and without the prose renderer → wrong for AsciiDoc workspaces and unusable
  for rendering. The snapshot loader must reuse the notation adapter for both sides.
- W015 (missing chapter heading) is only a warning, only checks numbered files and
  only checks the first heading's title — it never catches content *before* the first
  heading. Hence the separate E017.
- Block element `loc.line` is the `:::` line inside the fence, not the fence line.
- The prose renderer stores a prose run's HTML on the run's *first* node (often blank);
  the other nodes get `""`.
- `execFileSync` rejections surface git's own `fatal:` message in the thrown error.
- Old-engine errors surfaced by replaying `docs/arc42` history (HEAD~15, HEAD~40): sections
  appended after a block were counted as that block's prose (two false
  `prose-without-block-change`), and a deleted neighbouring subsection masked a real
  `block-without-prose-change` (bb-validator). These are the *only* output differences.
- A section holding both a block and a diagram attaches diagram-describing prose to the block
  (e.g. `bb-core` + core drill-down diagram). Changing that prose alone is reported; accept with
  `ARC42_CONSISTENT` when the model is intentionally unchanged.
- `affectedRanges` / `affectedFiles` in `DiffResult` are only consumed by tests.
- `pnpm run check` on a fresh checkout reports 4 type errors in `MetaModelView.tsx`
  until `pnpm run build` has run: the `@arc42/core` `.` export has no `types`
  condition, so types resolve from `dist`. CI builds before `check`. Not fixed here.

## Explore
### Tasks
- [x] Read issue #87 and map ideas to existing code (`diff.ts`, `git-diff.ts`, `serve`, `build`, web SPA).
- [x] Identify gaps: no element-level diff; base side not rendered/AsciiDoc-unaware.
- [x] Resolve identity, id-less blocks, scope and relation to the existing diff with the user.
- [x] Check whether blocks outside headings exist in docs/examples/tests (none).

### Completed
- [x] Created development plan file
- [x] Plan documented on issue #87

## Plan
### Tasks
- [x] Phase 0: E017 validation error for blocks outside any heading.
- [x] Phase 1: `loadDiffSnapshots(dir, spec)` + `diffWorkspaces(base, head)` alongside existing code.
- [x] Phase 2: rename to `lintArchitectureDiff`, rebuild on phase 1, remove line-range logic and old `collectGitDiff` parsing path.
- [x] Phase 3: `arc42 diff --format json`.
- [ ] Phase 4: `serve --diff` / `build --diff`, Changes view, inline mode.
- [ ] Phase 5: side-by-side mode, graph highlighting, example GitHub Action.
- [ ] Phase 6: timeline (`arc42 history`, web Timeline view).

## Code
### Phase 0 — E017 (540e96c)
- [x] Rule `e017-block-outside-section.ts`, registered after E016.
- [x] Unit tests `core/tests/validator-e017.test.ts` (Markdown, AsciiDoc).
- [x] Black-box `cli/tests/validate-structure-cli.test.ts`; verified the tests fail without the rule.
- [x] `validate:source`: docs/arc42 and examples unaffected; no existing test changed.
- Decision: applies to `block` nodes only — diagrams are keyed by id and need no section.

### Phase 1 — snapshots + semantic diff
- [x] `core/src/workspace-diff.ts`: `diffWorkspaces` + types, exported from `@arc42/core` and `@arc42/core/types`.
- [x] `workspace-fs/src/diff-snapshots.ts`: `loadDiffSnapshots(dir, { reference, staged })`.
- [x] `workspace-fs/src/workspace-parse.ts`: shared notation detection + parsing, now also used by
      `loadWorkspace`, `validateWorkspace`, `readWorkspaceDocuments` (one parse path for every side).
- [x] Invalid snapshots throw: duplicate element/diagram ids, blocks outside a heading, unknown refs,
      unreadable blobs, mixed notation, range + staged.
- [x] Unit tests `core/tests/workspace-diff.test.ts` (18).
- [x] Black-box tests `workspace-fs/tests/diff-snapshots.test.ts` (11): real temp git repos, public API
      only — every scope (default, staged, ref, `a..b`, `a...b`), AsciiDoc on both sides, workspace
      filtering, deleted files, failures. The CLI is not wired yet, so the library boundary is the
      black box for this phase.
- Deferred to phase 2: update `bb-diff` / `if-workspace-diff` in `docs/arc42` once the diff module
  layout settles (the CLI does not use the new code yet, so the docs are still accurate).

### Phase 2 — lint on the semantic diff
- [x] e4fe1d7 `refactor(core)!`: pure rename to `lintArchitectureDiff` / `LintDiffOptions`.
- [x] 925ed84 `refactor(core,cli)!`: lint derived from `ElementChange`; CLI uses `loadDiffSnapshots`.
      `diff-cli.test.ts` unchanged and green; `diff.test.ts` assertions unchanged (fixtures are parsed
      workspaces now; one `affectedRanges` assertion removed with the field). New black-box
      `diff-semantic-cli.test.ts`; three of its cases fail on the old engine (verified).
- [x] e3db264 `refactor(workspace-fs)!`: removed `collectGitDiff`, `GitArchitectureDiff`,
      `changedHunkFiles`; `git-diff.test.ts` keeps the path-header test only.
- [x] 6044e9f `feat(cli)`: `a..b` / `a...b` in `arc42 diff`, help + README, black-box range tests.
- [x] 80d5594 `docs(arc42)`: `bb-diff` → "Diff Lint", new `bb-semantic-diff` + `if-semantic-diff`,
      `if-workspace-diff` → `diff-snapshots.ts`, runtime scenario, deployment hosts, `dec-semantic-diff`.

### Phase 3 — JSON output (2bf3353)
- [x] `{ version: 1, base: { label, commit }, head: { label }, acceptanceBase, accepted,
      hasBlockingFindings, findings, architecture }`; same exit codes as text mode.
- [x] Unknown `--format` values exit 2 (validate silently falls back to text; not changed here).
- [x] Black-box tests: change set + findings, acceptance, unknown format.

## Commit
### Tasks
- [ ] Keep docs/arc42 (dogfood) aligned when CLI/core responsibilities change (phases 1–4).
- [x] README / CLI help for `a..b`, `a...b`, `--format json`.
- [ ] README / CLI help for `serve --diff`, `build --diff`.
