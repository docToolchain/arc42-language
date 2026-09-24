# Development Plan: arc42-language (feat/diff-coverage-degradation-hints branch)

*Generated on 2026-09-13 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Add **coverage-degradation hints** to the `arc42 diff` CLI command.

When a diff is analysed, compare path coverage between the _base_ documents and the _current_ documents. Any directory (or file) that was previously **covered** by an architecture element but is now **uncovered** — or any directory that is newly present in the workspace but has no element claim — is surfaced as a `hint` finding of kind `"new-building-block-hint"`.

This helps teams catch newly-added source packages/modules that are not yet documented in the architecture.

---

## Key Decisions

1. **Where the new logic lives** — `packages/core/src/diff.ts`.  
   The existing `analyzeArchitectureDiff` function already receives `current` and `base` document arrays. `AnalyzeDiffOptions` is extended with four optional fields:
   - `currentElements?: Element[]`
   - `baseElements?: Element[]`
   - `currentKnownPaths?: Set<string>`
   - `baseKnownPaths?: Set<string>`
   These are optional so existing callers keep working unchanged.

2. **New `DiffFinding` kind** — `"new-building-block-hint"` added to the union in `DiffFinding.kind`. Severity is always `"hint"` (non-blocking). The name reflects the arc42 vocabulary: the uncovered paths suggest a missing *building block* in the architecture.

3. **New `DiffResult` field** — `coverageFindings: DiffFinding[]` added alongside the existing `consistencyFindings` and `pathFindings`. `hasBlockingFindings` is NOT affected by coverage findings (they are hints only).

4. **Coverage diff logic** — A private `coverageDiffFindings(options)` helper inside `diff.ts`:
   - If `options.currentElements` is absent OR `options.currentKnownPaths` is absent/empty → return `[]`.
   - Call `computeCoverage(options.currentElements, [...options.currentKnownPaths])` → `currentCoverage`.
   - If `options.baseElements` and `options.baseKnownPaths` are provided, call `computeCoverage(options.baseElements, [...options.baseKnownPaths])` → `baseCoverage`. Otherwise `baseCoverage = { uncovered: [] }`.
   - `newlyUncovered = currentCoverage.uncovered.filter(p => !baseCoverage.uncovered.includes(p))`.
   - Return a `DiffFinding` per entry: `kind: "new-building-block-hint"`, `severity: "hint"`, `file: path`, `line: 0`, `message: "'${path}' is not covered by any building block — consider adding a building-block element."`.
   - Sort by `file` alphabetically.

5. **CLI wiring** — In `runDiff` (cli.ts):
   - After `collectGitDiff`, derive elements from both document sets using `loadWorkspaceFromDocuments` (imported from `@arc42/core`).
   - Pass `currentElements`, `baseElements`, `currentKnownPaths`, and `baseKnownPaths` to `analyzeArchitectureDiff`.
   - Rendering: coverage hints get their own rendering block (separate from path-hint grouping since they have no `change.filePath` correlation); appended to the `findings` spread.
   - Display format: `hint <path>  not covered by any building block — consider adding a building-block element`

6. **`workspace-fs` changes** — `GitArchitectureDiff` now carries `currentKnownPaths` (from `stagedFiles`) and `baseKnownPaths` (from `baseFiles`) separately instead of a single `knownPaths` union. The CLI reads these two split sets directly.

7. **Existing `DiffResult` consumers** — the `coverageFindings` field is always present (empty array when not applicable) to avoid optional-field noise. Existing test assertions compile because TypeScript structural typing is additive.

8. **`loadWorkspaceFromDocuments` import in CLI** — already available from `@arc42/core`; just add it to the existing import statement.

9. **Strict mode + acceptance flow** — `new-building-block-hint` findings are treated exactly like `implementation-path` hints for exit code and `ARC42_CONSISTENT` acceptance. They are non-blocking normally but fail under `--strict`.

11. **Replace `knownPaths` union with `currentKnownPaths` + `baseKnownPaths`** — The original `knownPaths: Set<string>` union was redundant once split sets were introduced. `GitArchitectureDiff` now only carries `currentKnownPaths` (from `stagedFiles`) and `baseKnownPaths` (from `baseFiles`). `AnalyzeDiffOptions` follows suit: `knownPaths` is removed; callers pass the split sets. In `analyzeArchitectureDiff`, the union for path-hint matching is computed lazily as `new Set([...currentKnownPaths, ...baseKnownPaths])` only when needed. This eliminates the root cause of false negatives (newly-added files were included in the base's coverage domain via the union, causing them to appear uncovered in both snapshots and producing no `newlyUncovered` entries).

10. **Coverage findings rendering** — The `findings` array in cli.ts is built from `[...result.consistencyFindings, ...result.pathFindings, ...result.coverageFindings]`. The severity-sort and grouping logic for hint-kind findings handles new kind values transparently. Coverage hints are rendered in their own separate block after the path hints block.

---

## Notes

### Relevant source files
| File | Role |
|---|---|
| `packages/core/src/diff.ts` | Core diff logic — add new kind, field, and helper |
| `packages/core/src/coverage.ts` | `computeCoverage(elements, trackedPaths)` — already exported |
| `packages/core/src/index.ts` | Barrel — `loadWorkspaceFromDocuments` already exported; types flow through |
| `packages/cli/src/cli.ts` | `runDiff` — wire in elements + render coverage findings |
| `packages/core/tests/diff.test.ts` | Unit tests for `analyzeArchitectureDiff` |
| `packages/cli/tests/diff-cli.test.ts` | Integration/acceptance tests for CLI diff command |

### `computeCoverage` signature
```ts
computeCoverage(elements: Element[], trackedPaths: string[]): CoverageResult
// CoverageResult.uncovered: string[]  — top-level domain entries with no element claim
```

### `loadWorkspaceFromDocuments` (from `@arc42/core`)
```ts
loadWorkspaceFromDocuments(documents: DocumentAst[]): WorkspacePayload
// WorkspacePayload.elements: Element[]
```

### `GitArchitectureDiff` (available in `runDiff`)
```ts
diff.currentDocuments:  DocumentAst[]
diff.baseDocuments:     DocumentAst[]
diff.currentKnownPaths: Set<string>  // from stagedFiles
diff.baseKnownPaths:    Set<string>  // from baseFiles
```

### Coverage finding message format
- Core message: `'${path}' is not covered by any building block — consider adding a building-block element.`
- CLI display: `hint <path>  not covered by any building block — consider adding a building-block element`

### Edge cases considered
- **No elements at all** — `computeCoverage` returns `empty` immediately (uncovered = []); no false findings.
- **No `knownPaths`** — helper returns `[]` early; no findings.
- **Empty `knownPaths`** — same, `computeCoverage` returns empty when no tracked paths match element parent dirs.
- **Base elements absent** — `baseCoverage.uncovered = []`, so ALL currently uncovered paths become `newlyUncovered`. This is intentional: when running against a range with no prior architecture docs, every uncovered path is new.
- **Same paths uncovered in both base and current** — correctly excluded (not "newly" uncovered).
- **Sorting** — findings sorted alphabetically by `file` for deterministic output.
- **`Element` type import** — must import `Element` from `"./model/types.ts"` in `diff.ts`.
- **`computeCoverage` import** — must import from `"./coverage.ts"` in `diff.ts`.

---

## Explore
### Tasks
- [x] Read development plan file
- [x] Read `packages/core/src/diff.ts` — understand existing types and flow
- [x] Read `packages/core/src/coverage.ts` — understand `computeCoverage` API
- [x] Read `packages/cli/src/cli.ts` — understand `runDiff` wiring
- [x] Read `packages/workspace-fs/src/git-diff.ts` — understand `GitArchitectureDiff`
- [x] Read `packages/workspace-fs/src/index.ts` — understand `loadWorkspaceFromDocuments` availability
- [x] Read `packages/core/src/index.ts` — confirm exports
- [x] Read existing tests (`diff.test.ts`, `diff-cli.test.ts`) — understand test patterns

### Completed
- [x] Created development plan file
- [x] Full explore phase — findings documented above

---

## Plan
### Tasks
- [x] Analyse existing code and document Key Decisions
- [x] Write detailed implementation tasks for Code phase (see Code section below)
- [x] Identify edge cases and document them in Notes

### Completed
- [x] Plan phase fully documented

---

## Code
### Tasks

#### Step 1 — `packages/core/src/diff.ts`
- [x] Add `import type { Element } from "./model/types.ts"` at top of file
- [x] Add `import { computeCoverage } from "./coverage.ts"` at top of file
- [x] Extend `DiffFinding.kind` union: add `| "new-building-block-hint"`
- [x] Add `coverageFindings: DiffFinding[]` field to `DiffResult` interface
- [x] Add `currentElements?: Element[]`, `baseElements?: Element[]`, `currentKnownPaths?: Set<string>`, `baseKnownPaths?: Set<string>` to `AnalyzeDiffOptions`
- [x] Implement private `coverageDiffFindings(options: AnalyzeDiffOptions): DiffFinding[]` helper
- [x] Call `coverageDiffFindings(options)` inside `analyzeArchitectureDiff` and include in returned `DiffResult`
- [x] Update the `return { ... }` statement to include `coverageFindings`

#### Step 1b — `packages/workspace-fs/src/git-diff.ts` *(discovered during implementation)*
- [x] Add `currentKnownPaths: Set<string>` and `baseKnownPaths: Set<string>` to `GitArchitectureDiff`
- [x] Populate them from `stagedFiles` and `baseFiles` separately in `collectGitDiff`

#### Step 2 — `packages/cli/src/cli.ts`
- [x] Add `loadWorkspaceFromDocuments` to the `@arc42/core` import statement
- [x] In `runDiff`, after `collectGitDiff`, derive `currentElements` and `baseElements` using `loadWorkspaceFromDocuments`
- [x] Pass `currentElements`, `baseElements`, `currentKnownPaths`, `baseKnownPaths` to `analyzeArchitectureDiff`
- [x] Add `...result.coverageFindings` to the `findings` spread
- [x] Add separate rendering for `new-building-block-hint` findings after the path hints block

#### Step 3 — `packages/core/tests/diff.test.ts`
- [x] Add test: "returns empty coverageFindings when no elements provided"
- [x] Add test: "returns empty coverageFindings when no knownPaths provided"
- [x] Add test: "returns empty coverageFindings when knownPaths is empty"
- [x] Add test: "reports new-building-block-hint for path uncovered in current but not in base"
- [x] Add test: "does not report new-building-block-hint for path uncovered in both base and current"
- [x] Add test: "reports all uncovered paths as new-building-block-hints when no baseElements provided"
- [x] Add test: "coverage findings are sorted alphabetically by file"
- [x] Add test: "hasBlockingFindings is not affected by coverage findings"

#### Step 4 — `packages/cli/tests/diff-cli.test.ts`
- [x] Add test: "reports new-building-block-hint for a newly added uncovered directory"
- [x] Add test: "new-building-block-hint is accepted with ARC42_CONSISTENT token"

### Completed
- [x] All implementation tasks complete — 353/353 tests pass

---

## Commit
### Tasks
- [x] Run tests: `pnpm test` in workspace root
- [x] Review diff: `git diff --stat` to confirm only intended files changed
- [x] Commit with conventional message: `feat(diff): report new-building-block-hint for uncovered paths introduced by diff`

### Completed
- [x] All commit tasks complete

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
