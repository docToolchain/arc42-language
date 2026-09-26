# Development Plan: arc42-language (feat/historic-snapshots branch)

*Generated on 2026-09-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Let readers open the **whole architecture as it was at an earlier commit**, not only the change
of that commit. A pearl in the history gets a "Browse this version" link; the normal document
view then shows that version, with a banner naming the commit and a way back.

The browser loads the old version's architecture files and parses them itself (client-side
loading). Nothing is parsed ahead of time for old versions.

## Key Decisions

- **Option 1 of three: store the old files, parse them in the browser.** `arc42 build
  --with-history` also saves the architecture files of each pearl; `arc42 serve` reads them from
  git on request. The browser turns them into the model with the same code the server uses.
  Chosen because it is the smallest change, keeps the output moderate, and keeps one way of
  building the model. Rejected options: see *Notes → Options considered*.
- **Purely additive.**
  - Without `--with-history` a build produces the same pages as today. The only
    differences are one extra script file, which is never loaded, and the removed fallback below.
  - With history, the existing files in `history/` stay unchanged; the snapshot files are added
    next to them.
- **Core stays free of data sources.** Core gets pure functions only: files in, model out. It
  knows nothing about git, URLs, folders or file layouts. The user rejected an earlier draft
  that put a "source" interface and the published layout into core.
- **No new package.** The reader for snapshot files is a small module in `web`. A separate
  `workspace-http` package is only worth it when a second reader exists (e.g. loading from
  GitHub). See *Notes*.
- **Layout mirrors git.** Per commit a file list maps each path to its git blob id, and each file
  version is stored once under its blob id. Files that do not change between commits are shared.
  A later GitHub reader would map onto this one to one.
- **Only architecture files are ever served or written.** Code is listed by path and blob id
  (needed for coverage), never by content. The producer in `workspace-fs` enforces this, so
  `serve` and `build` cannot differ. In `serve`, a request for any other blob is an error.
  Without this check anyone reaching the server could read any file of the repository.
- **File lists are shared when unchanged.** Coverage needs the list of *all* tracked paths of
  a version. One full list per commit costs about as much as all architecture file versions
  together (see measurements), so a commit refers to the previous list when it did not change.
- **The working-tree pearl gets no snapshot.** It is the live workspace; "Browse this version"
  on it goes to the normal view.
- **Diffs stay computed at build/serve time.** The lint's code-change evidence needs `git diff`.
  The existing chunk files with precomputed diffs are kept.
- **Markdown renderer: remove the silent fallback.** `MarkdownProseRenderer` catches every error
  and returns `<p>text</p>`. Moving it into core removes that `catch`; errors surface.
- **`--single-file`** inlines the snapshot files just like it already inlines `history/`. This
  makes the page bigger, and only happens together with `--with-history`.

## Notes

### What exists today

- **Browser-safe already, exported from `@arc42/core`:**
  - `parseArchitectureDocumentAsync`
  - `loadWorkspaceFromDocuments`
  - `computeCoverage`
  - `diffWorkspaces`, `lintArchitectureDiff`, `buildDiffView`
  - `MarkdownParser` and `AsciidocParser`, via `@arc42/core/parser`
- **Stuck in `@arc42/workspace-fs` (Node only):**
  - The pure setup code: `isArchitectureFile`, `detectNotation` and `parseWorkspaceFiles`.
  - `loadSnapshot` in `diff-snapshots.ts`: filter the files, parse them, load the model, compute
    coverage.
  - The prose renderers: `MarkdownProseRenderer` uses `marked`, which `web` already depends on.
    `AsciidocProseRenderer` uses `asciidoctor`, which is large.
- **Git access** lives in `workspace-fs`:
  - `diff-snapshots.ts` has a private `SnapshotSource` (`label`, `paths()`, `read(path)`) with a
    commit, an index, a working-tree and an empty source.
  - `history.ts` lists the pearls and loads the chunks.
- **History today:**
  - `core/src/history.ts` holds `HistoryPearl` and `HistoryEntry`. Its doc comment also describes
    the JSONL layout and the URLs. That is transport knowledge inside core, and should move out
    in a later cleanup.
  - `cli.ts` serves `/api/history/*` (around line 758) and writes `history/` in `build`
    (around line 1010).
  - `web/src/useHistory.ts` reads it from a URL (`{ base }`) or from inlined files (`{ files }`).
- **What the diff needs** (`workspace-fs/src/diff-payload.ts`):
  - the two models;
  - the tracked paths of both sides;
  - the names of the changed files.
  - `acceptanceBase` (the ARC42_CONSISTENT token) is used only by the commit hook, and only makes
    sense against a real git index.

### Options considered

1. **Store the old files, parse in the browser.** Chosen.
2. **Store the finished model of each version.** No parsing in the browser, and AsciiDoc works
   for free. Rejected: nothing is shared between commits, so the output grows with
   commits × workspace size. It would also need the same file lists.
3. **Let the browser do everything, diffs included.** The build publishes only the commit list,
   the file lists and the files; the browser computes every diff with core. This gives one path
   for diffs, a simple `serve`, and later a GitHub reader. Rejected for now: a large rebuild of
   how history works, not needed for this feature. It stays possible on top of option 1.

### Package structure: discussion and outcome

- **First draft: a `WorkspaceSource` interface and the snapshot layout in core.** Rejected: core
  must not know where data comes from.
- **Second draft: `workspace-http` as a counterpart of `workspace-fs`.** Found to be asymmetric:
  - `workspace-fs` reads the *source* (git, filesystem).
  - `workspace-http` would read a *publication*, including precomputed results.
  - A symmetric version (both answering "which versions, which files, which content, which
    changed paths") is option 3.
- **Outcome:** keep it simple. Core gets pure functions, `workspace-fs` produces the files,
  `cli` serves and writes them, and `web` reads them with a small module.

### Loading straight from a git URL (not in scope)

- **Plain git over HTTP** fails in the browser: GitHub and GitLab send no CORS headers on git
  endpoints. It would need a CORS proxy (e.g. with isomorphic-git), which as far as we know
  downloads the whole pack.
- **The GitHub web API and raw file URLs** allow browser requests:
  - A recursive tree gives all paths with their blob ids, which is our file list.
  - The limit is quotas: about 60 requests per hour without login.
- **The hard part is the history list.** Finding the commits that changed `*.arc42.md` files is
  `git log -- <pathspecs>`. The GitHub commits API filters by one path, not by a pattern.
- **Conclusion:** one version or one pull request can be loaded from GitHub; the whole history
  cannot, at least not without login. A possible later spike, not part of this plan.

### Measurements (this repository, 2026-09-26)

| | Value |
|---|---|
| Commits that changed architecture files | 56 |
| Distinct architecture file versions | 185 |
| Size of those versions, uncompressed | 1.36 MB |
| Size of the current architecture files | 0.24 MB |
| Tracked paths today (list size) | 427 (19 KB without blob ids) |
| One file list per commit, with blob ids | about 1–2 MB in total, hence sharing |

- Readers only download what they open. Opening one old version costs about the size of the
  current architecture files. Opening the next version costs only the files that differ.
- Static hosts such as GitHub Pages usually compress text files when sending them.
- Preparing the files is cheap: they are copied out of git, not parsed. The existing history
  build already does more work, because it parses two versions per commit to compute each diff.

### Effect on `serve`

- **Two new addresses** next to the existing history addresses, both read from git on request:
  - `/api/history/tree/<commit>.json`: the file list of one commit.
  - `/api/history/blob/<id>`: one file version.
- Nothing is precomputed, so startup does not change. Sharing file lists does not matter here.
- Old versions never change, so the browser may keep them while the working tree changes.
- Without a git repository, the new addresses return the same error the history already gives.

### Open questions

- **AsciiDoc in the browser:**
  - (a) load asciidoctor.js only for `.adoc` workspaces — preferred;
  - (b) fall back to prepared models;
  - (c) Markdown only, with a clear error.
- **Parse time in the browser** for the bookstore example and for this repository. Expected to be
  small; to be measured.

## Explore

### Completed

- [x] Check which parsing and model-building functions core already exports, and which are browser-safe
- [x] Find the Node-only parts: setup code, prose renderers, git access
- [x] Understand how history is served (`serve`), written (`build`) and read (`web`)
- [x] Understand what the diff needs from git (`changedFiles`, known paths, `acceptanceBase`)
- [x] Compare the options: store files, store models, browser does everything
- [x] Discuss package structure: source interface in core (rejected), `workspace-http` (deferred)
- [x] Check loading from a git URL in the browser: CORS, GitHub API quotas, history listing
- [x] Measure storage for this repository; identify file lists as the large part
- [x] Confirm the change is additive; describe its effect on `serve`

## Plan

### Implementation sequence

1. **Core: files in, model out.**
   - Add `loadWorkspaceFromFiles(files, trackedPaths)`: detect the notation, parse, build the
     model, compute coverage.
   - Move `isArchitectureFile` and `detectNotation` into core.
   - Move the notation parts (parser plus prose renderer) to core subpaths, e.g.
     `@arc42/core/notation/markdown`, so `marked` is only pulled in where it is imported.
   - Remove the silent `catch` in `MarkdownProseRenderer`.
   - `workspace-fs` uses the new function. Behaviour stays the same; the existing tests prove it.
2. **Producer in `workspace-fs`.**
   - `snapshotTree(dir, commit)`: all tracked paths with blob ids (`git ls-tree -r`).
   - `readSnapshotBlob(dir, id)`: one file (`git cat-file blob`). Refuses any blob that is not
     an architecture file of a history commit.
3. **Transport in `cli`.**
   - `serve`: `/api/history/tree/<commit>.json` and `/api/history/blob/<id>`.
   - `build --with-history`: write `history/tree/` and `history/blob/`. Each blob once; a file
     list shared with the previous commit when unchanged.
   - `--single-file`: inline them like the other history files.
4. **Reader and UI in `web`.**
   - A snapshot reader on top of `HistorySource`, so URLs and inlined files both work.
   - `useSnapshot(commit)`: loads the parser chunk on demand, fetches files, parses, caches per
     commit.
   - "Browse this version" on a pearl; a URL hash such as `#snapshot:<sha>`; the normal document
     view with a banner and a way back.
5. **Docs.** The CLI help for `--with-history`, and the history description on the site.

### Tests (black-box per phase)

- **core:** `loadWorkspaceFromFiles` gives the same model as `loadWorkspace` for the bookstore
  fixture.
- **workspace-fs:**
  - The file list contains every tracked path with its blob id.
  - A code file's blob is refused.
- **cli:**
  - A `--with-history` build contains the file lists and the blobs, and each blob exists once.
  - An unchanged file list is shared.
  - The `serve` addresses answer, and refuse a code blob.
  - A build without history is unchanged.
- **web (Playwright):**
  - On the evolution repository, open the `v1.0` pearl, browse it, and see "Response Cache"
    (the name before the rename).
  - A missing blob shows an error, not an empty chapter.

### Completed

- [x] Choose the option and the package structure
- [x] Sequence the work so each step keeps the tests green

## Code

### Tasks

- [ ] Step 1: core — `loadWorkspaceFromFiles`, notation subpaths, remove silent fallback
- [ ] Step 2: workspace-fs — `snapshotTree`, `readSnapshotBlob` with the architecture-file check
- [ ] Step 3: cli — `serve` addresses, `build` output, `--single-file`
- [ ] Step 4: web — snapshot reader, `useSnapshot`, "Browse this version"
- [ ] Step 5: docs
- [ ] Measure the build size and the parse time; record them here

### Completed

*None yet*

## Commit

### Tasks

- [ ] *To be added when this phase becomes active*

### Completed

*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
