# Development Plan: arc42-language (feat/path-coverage-report branch)

*Generated on 2026-09-10 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Two related improvements:

1. **`knownPaths` harmonization**: In git repos, use `git ls-files` instead of a raw filesystem walk for `pathEvidence`. The filesystem walk currently produces 35,000+ entries including `node_modules`, build artifacts, `.git`, etc. `git ls-files` returns only tracked files (~200-300), which is the meaningful scope for architecture traceability. If no `.git` root is found, fall back to the existing `collectPaths` filesystem walk.

2. **Path coverage report**: A new `arc42 coverage` CLI command that answers: "which top-level source path segments are claimed by the architecture model, and which are not?" The unit of coverage is the top-level path segment (e.g. `packages`, `src`, `docs`) derived from all building-block and interface `path` fields. A segment is "covered" if at least one modeled element claims it. This intentionally allows architects to exclude test-only or tooling paths from the model scope.

## Key Decisions

- **Git-first for `knownPaths`**: Use `git ls-files` when a `.git` root is detectable; fall back to `collectPaths` filesystem walk otherwise. This makes E011, H014, W018 work correctly in real repos (no false negatives from untracked build artifacts being in `knownPaths`).
- **Coverage unit = top-level path segment**: Extract the first path segment from every bb/interface `path` field (e.g. `packages/core/src` → `packages`). Deduplicate. These are the "architecturally claimed segments". Compare against top-level segments from `git ls-files` (or filesystem walk). Uncovered segments = top-level segments that no element claims.
- **Intentional non-coverage is valid**: Paths like `scripts/`, `demo/`, `tests/`, `examples/` being uncovered is expected and OK. The report shows the split without enforcing a threshold.
- **`arc42 coverage` always exits 0**: Pure informational output. No `--strict` flag. Coverage gaps are expected and intentional (test paths, tooling, docs that aren't modeled).
- **No new `--format` on `arc42 get`**: Coverage is not a query result — it's an analysis over the workspace + filesystem. A dedicated `arc42 coverage` command is cleaner and more discoverable.
- **`knownPaths` type stays `string[]`** in `PathEvidence` (for `@arc42/core`). The workspace-fs adapter handles the git/fs decision transparently before passing to core.
- **`WorkspacePayload` carries `trackedSegments: string[]`**: `loadWorkspace()` collects git-tracked paths (or filesystem fallback), reduces them to deduplicated top-level segments, and includes them in the payload. The web SPA and CLI both call the same pure `computeCoverage(elements, trackedSegments)` — no duplication, no separate API endpoint. Payload overhead is ~10-20 strings.
- **`computeCoverage` is a pure function in `@arc42/core`**: Takes `elements: Element[]` and `trackedSegments: string[]` (already-reduced top-level inventory). Returns a typed `CoverageResult`. Works identically in CLI and browser.
- **`gitLsFiles` extracted to a shared helper in `workspace-fs`**: Already used as `stagedFiles()` inside `git-diff.ts`. Extract it so `pathEvidence()` and `loadWorkspace()` can reuse it.

## Notes

### Current `knownPaths` sources (two different mechanisms)

| Context | Source | Quality |
|---------|--------|---------|
| `validateWorkspace` (via `pathEvidence()`) | `collectPaths()` — full filesystem walk | Noisy: includes node_modules, .git, build artifacts, 35k+ entries |
| `collectGitDiff` (diff command) | `git ls-files` — tracked files only | Clean: ~200-300 real source files |

### Coverage computation sketch

```
// workspace-fs: loadWorkspace()
trackedSegments = deduplicate(git ls-files | map(p => p.split('/')[0]))

// @arc42/core: computeCoverage()
modeledSegments = Map<segment, [{id, path}]> from all bb/if elements with .path

covered   = trackedSegments.filter(s => modeledSegments.has(s))
              → CoveredSegment[]  (segment + claimedBy list)
uncovered = trackedSegments.filter(s => !modeledSegments.has(s))
              → string[]
```

### Expected output for this repo

```
=== Path Coverage ===

Covered (2):
  docs       → bb-workspace (docs/arc42)
  packages   → bb-cli, bb-core, bb-web, bb-workspace-fs, bb-skill

Uncovered (6):
  arc42-language
  demo
  examples
  scripts
  LICENSE
  README.md

Coverage: 2 of 8 top-level segments (25%)
```

### `CoverageResult` type (new, in `@arc42/core`)

```ts
export interface CoveredSegment {
  segment: string;
  claimedBy: Array<{ id: string; path: string }>;
}

export interface CoverageResult {
  covered: CoveredSegment[];
  uncovered: string[];
  totalSegments: number;
  coveredCount: number;
}
```

### `WorkspacePayload` additions

```ts
export interface WorkspacePayload {
  elements: Element[];
  edges: Edge[];
  diagrams: DiagramArtifact[];
  documents: DocumentAst[];
  trackedSegments: string[];  // top-level path inventory (git ls-files or fs fallback, deduplicated)
}
```

The web SPA calls `computeCoverage(elements, trackedSegments)` on the client side. The CLI does the same in `runCoverage`.

### Files to touch

| File | Change |
|------|--------|
| `packages/workspace-fs/src/git-diff.ts` | Export `gitLsFiles(root): string[]` (thin wrapper around existing `stagedFiles`) |
| `packages/workspace-fs/src/index.ts` | `pathEvidence()`: try `gitLsFiles`, fall back to `collectPaths`; `loadWorkspace()`: compute `trackedSegments` and include in payload; export `gitLsFiles` |
| `packages/core/src/coverage.ts` | New file: `computeCoverage(elements, trackedSegments)` → `CoverageResult` |
| `packages/core/src/renderer/types.ts` | Add `trackedSegments: string[]` to `WorkspacePayload` |
| `packages/core/src/index.ts` | Export `computeCoverage`, `CoverageResult`, `CoveredSegment` |
| `packages/cli/src/cli.ts` | Add `coverage` to command dispatch; `runCoverage(dir, root, args)` calls `loadWorkspace` then `computeCoverage` |
| `packages/cli/src/help.ts` | Add `coverage` to `COMMANDS`; add `commandHelp("coverage")` case |
| `packages/web/src/types.ts` | Add `trackedSegments: string[]` to `WorkspacePayload`; add `CoverageResult`/`CoveredSegment` types |
| `packages/web/src/CoverageView.tsx` | New component: calls `computeCoverage`-equivalent logic, renders covered/uncovered table |
| `packages/web/src/App.tsx` | Inject `<CoverageView>` at bottom of chapter 05 doc when active doc is chapter 05 |
| `packages/core/tests/coverage.test.ts` | New: unit tests for `computeCoverage` |
| `packages/workspace-fs/tests/workspace-fs.test.ts` | Update `pathEvidence` and `loadWorkspace` tests to reflect git-aware behavior (fallback path) |

## Explore
### Tasks
- [x] Understand how `knownPaths` is collected and used
- [x] Identify the two different collection mechanisms (validate vs diff)
- [x] Understand the path matching logic in E011/W018/H014
- [x] Model the coverage computation (top-level segments)
- [x] Confirm `git ls-files` is already used in `git-diff.ts` as `stagedFiles`
- [x] List all files that need to change
- [x] Confirm plan file is up to date

### Completed
- [x] Created development plan file
- [x] Explored codebase and captured all findings

## Plan
### Tasks
- [x] Read `workspace-fs/src/index.ts`, `cli/src/cli.ts`, `cli/src/help.ts` to ground plan in actual code
- [x] Define `CoverageResult` type shape
- [x] Define all files to touch with precise changes
- [x] Write Code phase task list

### Completed
*None yet*

## Code
### Tasks

#### Step 1 — Export `gitLsFiles` from `packages/workspace-fs/src/git-diff.ts`
- [ ] Add exported `gitLsFiles(root: string): string[]` that calls `git ls-files -z` (same mechanics as internal `stagedFiles`)

#### Step 2 — Harmonize `pathEvidence` and update `loadWorkspace` in `packages/workspace-fs/src/index.ts`
- [ ] Import `gitLsFiles` from `./git-diff.ts`
- [ ] In `pathEvidence()`: try `gitLsFiles(repositoryRoot)`; if it throws (no git), fall back to `collectPaths(dir, repositoryRoot)`
- [ ] In `loadWorkspace()`: collect git-tracked paths via `gitLsFiles` (or fs fallback), reduce to deduplicated top-level segments, attach as `trackedSegments` on the returned payload
- [ ] Export `gitLsFiles` from the barrel

#### Step 3 — New `packages/core/src/coverage.ts`
- [ ] Define `CoveredSegment` and `CoverageResult` types
- [ ] Implement `computeCoverage(elements: Element[], trackedSegments: string[]): CoverageResult`:
  - Extract first path segment from every bb/interface `path` field → `modeledSegments` Map (segment → claimants)
  - Iterate `trackedSegments`: covered if in `modeledSegments`, otherwise uncovered
  - Return `{ covered, uncovered, totalSegments, coveredCount }`

#### Step 4 — Export from `packages/core/src/index.ts`
- [ ] Add `export { computeCoverage } from "./coverage.ts"`
- [ ] Add `export type { CoverageResult, CoveredSegment } from "./coverage.ts"`

#### Step 5 — Add `trackedSegments` to `WorkspacePayload` in `packages/core/src/renderer/types.ts`
- [ ] Add `trackedSegments: string[]` to `WorkspacePayload` interface

#### Step 6 — `arc42 coverage` in `packages/cli/src/cli.ts`
- [ ] Import `computeCoverage` from `@arc42/core`
- [ ] Add `"coverage"` branch to the command dispatch
- [ ] Implement `runCoverage(dir: string, root: string | undefined, args: string[])`:
  - Parse `--format <text|json>` (default: text)
  - `const payload = await loadWorkspace(dir)` — already has `trackedSegments`
  - Call `computeCoverage(payload.elements, payload.trackedSegments)`
  - Text output: covered segments with claimants, uncovered segments, summary line
  - JSON output: `console.log(JSON.stringify(result, null, 2))`
  - Exit 0 always

#### Step 7 — Help text in `packages/cli/src/help.ts`
- [ ] Add `["coverage", "Show which top-level source paths are claimed by the architecture model."]` to `COMMANDS`
- [ ] Add `commandHelp("coverage")` case with usage/options/description

#### Step 8 — Browser types in `packages/web/src/types.ts`
- [ ] Add `CoveredSegment` and `CoverageResult` interfaces (mirrored from core, maintained by hand)
- [ ] Add `trackedSegments: string[]` to `WorkspacePayload`

#### Step 9 — New `packages/web/src/CoverageView.tsx`
- [ ] Accept `elements: Element[]` and `trackedSegments: string[]` as props; compute coverage inline (mirrors `computeCoverage` logic — no Node.js import in the browser bundle)
- [ ] Render a "Path Coverage" section with covered segments table (segment | claimed by) and uncovered list
- [ ] Show summary: "N of M top-level segments covered (X%)"
- [ ] Style consistently with existing patterns

#### Step 10 — Inject `CoverageView` in `packages/web/src/App.tsx`
- [ ] Import `CoverageView`
- [ ] When active doc filename contains `05`, render `<CoverageView elements={payload.elements} trackedSegments={payload.trackedSegments} />` below the `DocumentView`

#### Step 11 — Tests in `packages/core/tests/coverage.test.ts`
- [ ] Test: no elements with paths → all tracked segments uncovered
- [ ] Test: one bb with `path: packages/core` → `packages` covered, others uncovered
- [ ] Test: multiple elements sharing same top-level segment → one covered entry with multiple claimants
- [ ] Test: element path with no slash (segment = path itself) → covered correctly
- [ ] Test: empty `trackedSegments` → covered = [], uncovered = []
- [ ] Test: `coveredCount` and `totalSegments` arithmetic

#### Step 12 — Update `packages/workspace-fs/tests/workspace-fs.test.ts`
- [ ] Existing `pathEvidence` test uses a temp dir (no git) → should still pass via fallback; add clarifying comment
- [ ] Add a `loadWorkspace` test asserting `trackedSegments` is populated (non-empty string array) from the fallback path

### Completed
*None yet*

## Commit
### Tasks
- [ ] To be added when this phase becomes active

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
