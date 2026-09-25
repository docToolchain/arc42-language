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
- **serve and build are symmetric** (user decision, replaces the earlier "timeline" and
  "serve --diff" split):
  - `--diff <spec>` visualizes a *single* difference (live in serve, frozen in build).
  - Without `--diff`, the docs view gains an alternative left-sidebar view: a **pearl chain**
    of commits (next to the human/agent toggle). Selecting a pearl shows its commit message
    (Markdown, rendered server-side) and the rendered changed segments on the right.
  - History data is **JSONL**: serve answers `GET /api/history?...` lazily for the time range in
    the viewport; `build --with-history` writes `history/*.jsonl` files loaded statically;
    `build --with-history --single-file` inlines everything, however large.
  - `build --single-file` is a flag of its own (also without history).
- **Pearls** = first-parent commits touching architecture documents. Commits with a non-empty
  semantic diff are full pearls; semantically empty ones (reformatting) are smaller and neutral.
  Code-only commits are not pearls. Merges diff against their first parent.
- **Working-tree pearl** at the top of the chain whenever there are uncommitted changes — in
  serve (live) *and* build (frozen at build time; absent in CI where it equals HEAD).
- **Self-contained JSONL lines**: commit metadata, rendered commit message, lint findings and a
  `DiffView` with the rendered base/head content of every changed segment — no full workspace
  per commit is needed to render it. One format for serve and build, one loader in the web.
- **Two-level loading**: a small eager pearl index (sha, date, title, +/~/− counts) so the whole
  chain is visible, plus chunked detail (`history/NNNN.jsonl` ⇔ `/api/history` chunk API).
- **Outside a git repository** serve shows a visible "not a git repository" note in the pearl
  view and keeps serving the docs; `serve --diff` and `build --with-history` fail.
- **Pearl index is cheap git metadata only** (sha, parent, author, date, subject, chunk). The
  semantic flag and counts need the diff, so they arrive with the chunk; unloaded pearls are drawn
  outlined. Otherwise drawing the chain would compute every diff and defeat lazy loading.
- **A broken commit fails only its pearl** (`error` on the entry, red pearl, alert in the main
  view). Old commits may violate rules introduced later (E017, duplicate ids); failing the whole
  history would make the feature unusable, skipping them silently would hide the problem.
- **Shallow clones**: a boundary commit is refused ("fetch more history") instead of being
  compared with the empty tree, which would show the whole repository as added.
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
- Playwright in this container: `@playwright/test` 1.63 expects Chromium 1243, the image has
  1194. Local runs use an untracked `packages/web/playwright.local.config.ts` (listed in
  `.git/info/exclude`) that sets `executablePath: /opt/pw-browsers/chromium`; the committed
  config is unchanged. Baseline: 24/24 e2e green.
- Commits that only add `:::ignore` directives are semantically empty (ignores are not part of
  the model) — they show as small neutral pearls.
- `execFileSync` defaults to a 1 MiB output buffer; real patches exceed it (root commit of this
  repository: 1.8 MB). `git()` now allows 1 GiB.
- The normal workspace payload uses absolute paths, snapshots repository-relative ones: the web
  matches documents by file name (as the hash routes already do).
- Recurring dogfood finding: describing a new feature in a building block's prose (e.g.
  `bb-web-renderer`) without a model change is reported as `prose-without-block-change` and has
  to be accepted with `ARC42_CONSISTENT` every time. Worth discussing whether feature-level prose
  should live in a sub-section without a block.
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
- [x] Phase 4: `DiffView` (rendered changed segments) + `serve --diff` / `build --diff` with the
      diff view in the web (inline mode), Playwright e2e.
- [x] Phase 5: history JSONL (index + chunks) for serve and build `--with-history`, pearl chain
      sidebar view, commit message, working-tree pearl.
- [ ] Phase 6: `build --single-file` (with and without `--with-history`).
- [ ] Phase 7: side-by-side mode, graph highlighting, example GitHub Action for PR previews.

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

### Phase 4 — single difference in the web
- [x] 3f748f8 `feat(core)`: `buildDiffView` — segments per changed section with both sides' AST
      nodes, the elements they define or mention (edge endpoints, ids used as diagram tokens) and
      the edges between them; self-contained, JSON round-trip safe. Sections keep their nodes; a
      preamble holding a diagram is a section.
- [x] 25bb16f `feat(cli)`: shared `loadDiff` → `DiffPayload { base, head, findings, view }`;
      `serve --diff` (`/api/diff`, head as `/api/workspace`, watches `.git/index` + `HEAD`, 500 +
      error on failed reload), `build --diff` (`window.__DIFF__`). Inline JSON escapes `<`
      (fixes a latent `</script>` break for `__WORKSPACE__` too).
- [x] e41e668 `feat(web)`: Changes view (`#changes`, landing page with a diff), sidebar entry +
      per-document badges, segments with status colours, attribute table, previous-version toggle,
      findings, empty state, error alert.
- [x] 5999c0d `docs(arc42)`: `if-cli-web` (`/api/diff`), `bb-web-renderer` prose (accepted finding).
- Tests: Playwright `diff-cli.spec.ts` (API/CLI, 7) + `diff-ui.spec.ts` (UI, 9); 40/40 e2e green.
- Insight: CLI tests run from source have no bundled web assets, so serve/build are tested
  black-box in the Playwright suite against `packages/cli/dist`.
- Insight: rendered section headings are `h2` like the document titles in the Changes view —
  tests use `data-testid="diff-document-title"`.

### Phase 5 — history
- [x] e86ecc4 `refactor`: `loadDiff` → `loadDiffPayload` in workspace-fs.
- [x] f8f82fc `feat(workspace-fs)`: `{ commit }` spec (first parent → commit; root vs empty tree).
- [x] 561d2e6 `fix(workspace-fs)`: 1 GiB git output buffer; shallow boundary commits refused.
- [x] e31a49e `feat(core,workspace-fs)`: `HistoryPearl`/`HistoryEntry`, `listArchitectureHistory`
      (first-parent log over the workspace's architecture files, working-tree pearl),
      `loadHistoryEntry`/`loadHistoryChunk` (chunks of 20), `toJsonLines`.
- [x] 0754717 `feat(cli)`: `/api/history/index.jsonl` + `chunk-<n>.jsonl` (commit entries cached,
      working tree recomputed, 422 outside Git); serve always follows the Git index/HEAD;
      `build --with-history` writes `history/` and injects `window.__HISTORY__`.
- [x] d3da91d `feat(web)`: Documents/History tabs, pearl chain, lazy chunks, commit message in the
      sidebar, entry view via ChangesView.
- [x] 9e55957 `docs(arc42)`: `if-cli-web`, `bb-web-renderer` (accepted finding), `dec-symmetric-history`.
- Real history of `docs/arc42` (shallow clone, 18 pearls): ~3.5 s for all entries; 15 semantic,
  2 ignore-only, 1 shallow boundary error.
- Tests: `history.test.ts` (12, real repos), Playwright `diff-history-cli.spec.ts` (5) and
  `diff-history-ui.spec.ts` (8); 53/53 e2e green.

## Commit
### Tasks
- [ ] Keep docs/arc42 (dogfood) aligned when CLI/core responsibilities change (phases 1–4).
- [x] README / CLI help for `a..b`, `a...b`, `--format json`.
- [x] README / CLI help for `serve --diff`, `build --diff`.
