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
- **Commits:** Conventional Commits with `## Intent`, `## Key decisions`,
  `## Side effects` body (see `.agents/skills/commit/SKILL.md`).

## Notes
- The base side of today's `collectGitDiff` is always parsed with the sync Markdown
  parser and without the prose renderer → wrong for AsciiDoc workspaces and unusable
  for rendering. The snapshot loader must reuse the notation adapter for both sides.
- W015 (missing chapter heading) is only a warning, only checks numbered files and
  only checks the first heading's title — it never catches content *before* the first
  heading. Hence the separate E017.
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
- [ ] Phase 1: `loadDiffSnapshots(dir, spec)` + `diffWorkspaces(base, head, changes)` alongside existing code.
- [ ] Phase 2: rename to `lintArchitectureDiff`, rebuild on phase 1, remove line-range logic and old `collectGitDiff` parsing path.
- [ ] Phase 3: `arc42 diff --format json`.
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

## Commit
### Tasks
- [ ] Keep docs/arc42 (dogfood) aligned when CLI/core responsibilities change (phases 1–4).
- [ ] README / CLI help for new flags (`--format json`, `serve --diff`, `build --diff`).
