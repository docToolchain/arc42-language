# Development Plan: arc42-language (refactor/split-bb-core-responsibilities branch)

*Generated on 2026-09-07 by Vibe Feature MCP*
*Workflow: [qrspi](https://codemcp.github.io/workflows/workflows/qrspi)*

## Goal
Refactor `bb-core` so that its responsibilities are explicit and cohesive, allowing a deliberate
change to the `@arc42/core` API while preserving the intended CLI behavior where practical. The
first concrete target is to remove reference-edge duplication from the pipeline facade and document
the resulting building-block boundaries.
## Key Decisions
- Keep parser, model/builder, resolver, validator, and renderer as cohesive modules inside the
  `@arc42/core` package; do not split them into separate npm packages.
- Treat architecture diff analysis as a separate core sub-building-block because it is consumed by
  the CLI but is independent of the validation pipeline.
- The `@arc42/core` API may change as part of the package-boundary refactor; compatibility with the
  old loading-oriented exports is not a constraint.
- Place the abstract `Edge` concept with resolver responsibilities, where reference relationships
  are derived and maintained.
- Keep filesystem-dependent implementation-path validation with the filesystem workspace/adapter;
  the pure processing core must not decide repository roots or inspect the filesystem.
- Keep diff analysis as a pure core building block. Its consistency analysis is independent of a
  workspace source, while implementation-path findings consume workspace-provided path knowledge.
- Make diff handling its own logical building block inside the core package, separate from the main
  parser/model/resolver/validator/renderer pipeline.
- Keep the parser/model/resolver/validator/renderer/diff logical building blocks inside `@arc42/core`,
  using source subpaths where useful; the filesystem workspace adapter is the explicit exception and
  is a separate workspace package rather than a core subpath.
- Do not treat filesystem/I/O as part of the core architecture-processing building block. Workspace
  acquisition/loading must have its own explicit building-block boundary, so future web-resource
  acquisition does not crowd the parser/model/resolver/validator/renderer responsibilities.
- Package separation is resolved: the loading boundary is a separate filesystem workspace package
  because it has source-specific dependencies and an independent evolution path.
- Use a pure `@arc42/core` for architecture processing and a separate filesystem adapter package for
  discovery/loading. Future web-resource loading should be another adapter rather than expanding
  the processing core. File watching and workspace-directory selection remain CLI concerns.

## Notes
*Additional context and observations*

## Questions
### Tasks
- [x] Confirm whether the desired refactor is limited to module boundaries or should also split the
  npm package into multiple packages.
- [x] Decide where the shared `Edge` type belongs when edge construction moves out of the facade.
- [x] Decide whether `explain` and repository-root/path analysis are in scope for this change.
- [x] Decide whether workspace loading is a core I/O building block, an application/service concern,
  or both at different layers.
- [x] Decide whether file watching remains a CLI/service concern or becomes a reusable core API.

### Completed
- [x] Created development plan file

## Research
### Tasks
- [x] Map all workspace loading, discovery, and watching entry points and consumers.
- [x] Map the current public exports and internal module dependencies of each core responsibility.
- [x] Record test coverage and package-boundary constraints for the refactoring.

### Completed
- `packages/core/src/arc42.ts` combines pipeline orchestration, workspace queries, edge construction,
  and canonical sorting.
- `buildEdges` duplicates the element-reference dispatch already present in
  `packages/core/src/resolver/index.ts`.
- `packages/core/src/diff.ts` is self-contained and only consumed by the CLI `diff` command.
- Existing architecture documentation already models five core children but omits diff analysis and
  the facade responsibilities.
- `packages/core/src/discovery.ts` recursively discovers `.arc42.md` files and re-exports Node's
  `readFile`; `packages/core/src/arc42.ts` reads those files, parses them, builds the model, and
  builds the reference index.
- `loadWorkspace()` does not return the domain `Workspace`; it returns a serializable
  `WorkspacePayload` containing sorted elements, edges, diagrams, and raw document ASTs for the web
  HTTP API.
- `validateWorkspace()`, `getElements()`, and `loadWorkspace()` each invoke the same private pipeline
  and therefore each performs discovery and file reads independently.
- File watching is currently implemented in `packages/cli/src/cli.ts` inside `runServe()`. It uses
  Node `fs.watch` recursively, filters for `.arc42.md`, debounces reloads by 100 ms, retains the
  last valid payload on reload errors, and broadcasts Server-Sent Events to connected clients.
- The CLI performs workspace-directory auto-discovery separately in `packages/cli/src/discover.ts`;
  core discovery accepts an already selected directory and only discovers chapter files below it.
- The core package exports only the package root (`./dist/index.mjs`) in `packages/core/package.json`;
  no source subpaths are currently public package exports.
- The architecture document describes the CLI as resolving a workspace directory and the core as
  owning the full pipeline from file discovery to validation output. It separately describes the
  documentation workspace as a file-system building block.
- The requested `.vibe/docs/requirements.md` file is not present at the specified path in the
  repository, so its requirements could not be read.
- Core tests cover validation, rendering/querying, diff analysis, and individual validator rules;
  no dedicated test for the CLI file watcher was found in the package test search.

## Design
### Tasks
- [x] Compare high-level ownership options for workspace loading/discovery and watching.
- [x] Agree on the logical core sub-building-block boundaries and their responsibilities.
- [x] Agree on the scope of `Edge`, `explain`, and repository-root/path analysis.
- [x] Record the selected direction and its governing constraints in Key Decisions.

### Completed
- Design inputs read: this plan; no `.vibe/docs/design.md` or `.vibe/docs/architecture.md` files
  exist in the repository.
- Design options prepared for user alignment:
  1. **Pipeline core with CLI-owned watching** — keep file discovery/loading as a core workspace
     input concern, keep watching and directory auto-discovery in the CLI, and expose cohesive
     logical core subpaths. This preserves the current ownership model and public behavior with
     the smallest conceptual change, but leaves core filesystem I/O coupled to the pipeline.
  2. **Ports-and-adapters core** — make the transformation pipeline independent of filesystem
     access, provide a core-facing input/loading boundary, and keep filesystem discovery and
     watching in adapters (CLI or another host). This improves reuse and testability, but creates
     an additional boundary and requires the CLI to assemble more responsibilities.
 3. **Workspace application service** — make one explicit workspace service own loading, parsing,
     model construction, indexing, and query/payload orchestration; keep parser/model/resolver/
     validator/renderer as subordinate logical building blocks and keep watching in the CLI. This
     makes the end-to-end use case explicit and reduces facade duplication, but risks recreating a
     large facade if the service boundary is not kept narrow.
- User design constraint: filesystem/I/O must not be hidden inside the core processing building block;
  it should be an explicit building block at minimum, with future web-resource loading considered
  as a separate acquisition concern rather than an expansion of the processing pipeline.
- Package-level alternatives to evaluate: keep a dedicated I/O building block inside `@arc42/core`,
  extract filesystem loading into a separate package while keeping source-neutral contracts in core,
  or defer extraction until a second acquisition source exists.
- Design agreement: extract filesystem discovery/loading into a separate adapter package; keep
  `@arc42/core` source-independent at the architecture-processing boundary.
- Design agreement: place the abstract `Edge` concept with resolver responsibilities.
- `explain` is static guidance based on block types and does not perform filesystem access; the I/O
  split does not require moving it out of the processing package, though it may remain a separate
  logical guidance sub-building-block.
- Repository-root and implementation-path analysis is different: current validation uses filesystem
  checks and therefore crosses the new pure-core boundary. It must either move to the filesystem
  adapter or be represented in core through an injected/source-neutral path-evidence boundary.
- Design agreement: allow the public `@arc42/core` API to change rather than preserving the current
  loading-oriented API surface.
- Design agreement: filesystem-dependent implementation-path validation belongs to the filesystem
  workspace/adapter, because only that workspace can establish repository roots and inspect authored
  paths.
- Design agreement: diff handling is an explicit logical building block within `@arc42/core`, not
  part of the main validation pipeline or the filesystem workspace package.
- Updated `docs/arc42/05-building-blocks.arc42.md` to document the pure core boundary, the separate
  Architecture Diff building block, and the Filesystem Workspace Adapter.
- Updated `docs/arc42/07-deployment-view.arc42.md` to include the filesystem workspace adapter and
  diff building block in the toolchain deployment view.
- Validated the documentation with `pnpm exec arc42 --dir docs/arc42 validate`: 0 errors and 0
  warnings; remaining output consists only of non-blocking hints for runtime coverage and omitted
  implementation paths on planned/new building blocks.
- Fixed the deployment diagrams in `docs/arc42/07-deployment-view.arc42.md` to use Mermaid
  architecture-beta-safe identifiers, explicit aliases to the arc42 IDs, and architecture-beta's
  undirected edge syntax.
- Simplified the deployment overview to show only the three deployment units; the npm-distributed
  package contents remain in the separate detailed deployment diagram. Documentation validation
  remains at 0 errors and 0 warnings.
- Added `docs/verdicts/luna-refactoring.md`, an honest user-facing review of where the CLI helped
  with overview, diffs, and validation, and where human architectural judgment was essential.
- Revised the verdict to distinguish CLI validation from live rendered review, explicitly mention the
  hot-updating `arc42 serve` workflow, and identify diagram/rendering integration as an area where
  the tooling could mature.
- The diff analyzer has two logically distinct inputs: pure consistency analysis over current/base
  ASTs and changes, plus implementation-path hints that use an optional `knownPaths` set. The CLI's
  Git workspace currently supplies that set. The analyzer itself performs no filesystem access, so
  it can remain a pure core building block while workspace-specific path knowledge stays outside it.
- Structure the implementation in three vertical slices: establish the source-neutral core contract
  first, reconnect filesystem-backed CLI behavior second, and separate diff acquisition from analysis
  third.
- Treat the existing CLI behavior—payload shape/order, validation/query results, live reload, reload
  error retention, and diff findings—as the regression baseline where the new boundaries do not
  intentionally change it.
- Test the pure core and pure diff analyzer with in-memory fixtures; test filesystem and Git behavior
  only through adapter/CLI integration fixtures.
- Resolve the previous wording ambiguity explicitly: `@arc42/core` remains the processing package,
  while filesystem discovery/loading and its source-specific dependencies are implemented by a
  separate filesystem workspace package consumed by the CLI.
- Keep `git-diff` acquisition in the filesystem/Git workspace package; the CLI remains responsible for
  selecting the workspace and presenting diff results, while the core Architecture Diff analyzer
  receives documents, changes, and optional path evidence.
- Preserve the `WorkspacePayload` HTTP contract used by the web renderer unless a coordinated web and
  CLI change is deliberately required; treat payload shape and ordering as an explicit regression
  boundary.
- Treat separate facade and validator validation-option types as a design smell: one source-neutral
  validation context serves both the public core entry point and validator rules, with
  filesystem-specific acquisition kept in the adapter.

## Structure
### Tasks
- [x] Define end-to-end vertical slices for the source-independent core, filesystem adapter, and diff
  workflow.
- [x] Bound each slice by user-visible behavior, participating building blocks, and end-to-end
  verification.

### Completed
- **Slice 1 — Process an in-memory architecture workspace:** A caller can provide source-neutral
  architecture documents and receive the built model, resolver relationships, validation results,
  rendered/queryable output, and static explanations without filesystem access. This crosses the
  parser, model/builder, resolver (including `Edge`), validator, renderer/query layer, and explain
  guidance within `@arc42/core`. End-to-end verification uses an in-memory fixture and asserts the
  resulting model, relationships, validation output, and rendered/queryable result through the
  public core API.
- **Slice 2 — Load and serve a filesystem workspace:** A CLI user can select a local workspace and
  obtain the same architecture behavior through filesystem discovery/loading, while file watching
  remains a CLI concern. This crosses the filesystem workspace adapter, the source-independent core
  pipeline, and CLI commands/API serving. End-to-end verification runs the CLI against a fixture
  workspace and checks discovery, loading, validation/query output, and the existing serve/reload
  behavior without putting filesystem access back into core.
- **Slice 3 — Analyze architecture changes with workspace path evidence:** A CLI user can compare
  base and current architecture documents and receive consistency and implementation-path findings.
  This crosses the core Architecture Diff building block, the filesystem/Git workspace adapter that
  supplies optional `knownPaths`, and the CLI diff command. End-to-end verification compares fixture
  revisions with and without path evidence and asserts that pure consistency findings remain
  source-independent while path findings reflect the supplied workspace knowledge.

## Plan
### Tasks
- [x] Define ordered implementation tasks, dependencies, and verification for each vertical slice.
- [x] Define the public-boundary changes needed to keep core source-independent and preserve CLI
  behavior where intended.
- [x] Record slice-specific risks, mitigations, and cross-slice completion criteria.

### Completed
- **Slice 1 plan — Process an in-memory architecture workspace**
  1. Establish the source-neutral core input/output contract around already available document
     content and workspace path evidence; remove loading-oriented assumptions from the core facade.
  2. Move pipeline orchestration behind that contract while retaining parser, model/builder, resolver,
     validator, renderer/query, and explain responsibilities as cohesive core modules.
  3. Make resolver-owned edge construction the single relationship-construction path and remove the
     facade's duplicate edge dispatch and sorting responsibility where it is no longer needed.
  4. Consolidate the parallel validation-option shapes into one deliberate,
     source-neutral validation context (or document a necessary distinction) and replace filesystem
     `dir`/`root` semantics with supplied path evidence.
  5. Remove repository-root resolution and direct filesystem/process access from core; split the
     implementation-path rules so core evaluates supplied evidence and the filesystem adapter
     supplies that evidence. Migrate filesystem-backed implementation-path tests to adapter tests.
  6. Extend resolver responsibilities to provide the authoritative `Edge` representation required by
     payload/query consumers, then remove the facade's duplicate edge dispatch while preserving edge
     labels, endpoints, and ordering.
  7. Keep implementation-path validation pure by consuming optional source-neutral path evidence;
     do not let core establish repository roots or inspect files.
  8. Keep `explain` in core as static guidance and include it in the public-contract coverage.
  9. Update core-facing tests to exercise the public contract with in-memory fixtures, including
     model construction, reference edges, validation, rendering/querying, explanations, and absent
     or present path evidence.
  - **Dependency:** none; this is the foundation for the adapter and CLI slices.
  - **Risk:** the existing `loadWorkspace`, `getElements`, and `validateWorkspace` callers may rely on
    the old loading-oriented API and repeated-pipeline behavior. Mitigate by inventorying callers,
    changing the API deliberately, and asserting equivalent intended results in contract tests.

- **Slice 2 plan — Load and serve a filesystem workspace**
  1. Define the filesystem workspace adapter boundary for recursive chapter discovery, file reading,
     repository-root/path knowledge, and conversion to the core's source-neutral input.
  2. Move filesystem-dependent discovery/loading and implementation-path evidence acquisition behind
     that boundary; keep workspace-directory auto-discovery, file watching, debouncing, reload-error
     retention, and SSE broadcasting in the CLI.
  3. Reassemble CLI validation, querying, rendering, and serving through the adapter plus the pure
     core contract, without restoring filesystem imports to core.
  4. Update package/workspace wiring and public exports to expose the intended separate adapter/core
     package boundaries; keep logical core sub-building-blocks inside `@arc42/core`.
  5. Preserve the `WorkspacePayload` shape and ordering consumed by `@arc42/web`, coordinating any
     intentional change across adapter, CLI, and web consumers.
  6. Add end-to-end fixture coverage for directory selection, recursive discovery, successful loading,
     validation/query responses, live reload, and retention of the last valid payload after a reload
     error.
  - **Dependency:** Slice 1's source-neutral core contract.
  - **Risk:** moving loading may subtly change payload ordering, raw AST availability, error handling,
    or serve timing. Mitigate with existing CLI behavior as regression criteria and explicit fixture
    assertions for ordering, errors, and reload behavior.

- **Slice 3 plan — Analyze architecture changes with workspace path evidence**
  1. Keep the Architecture Diff building block independent of filesystem APIs and define its inputs as
     base/current architecture data, changes, and optional known-path evidence.
  2. Move or implement Git revision/document/path acquisition in the filesystem/Git workspace package;
     keep the CLI responsible only for workspace selection and presentation.
  3. Route the CLI diff command through the separated core analyzer and adapter inputs, preserving the
     distinction between consistency findings and implementation-path findings.
  4. Add end-to-end fixtures for changed relationships/elements and implementation paths, with cases
     that omit path evidence and cases that provide it.
  5. Verify that identical pure consistency results are produced regardless of source, while path
     findings change only when supplied workspace evidence changes.
  - **Dependency:** the core boundary from Slice 1; adapter wiring from Slice 2 may be reused but the
    pure analyzer tests must not depend on the filesystem adapter.
  - **Risk:** diff output may accidentally become coupled to Git or to the filesystem adapter. Mitigate
    by keeping pure analyzer fixtures in core and testing the CLI adapter integration separately.

- **Cross-slice completion criteria**
  - Core imports and behavior are source-independent; filesystem and Git access are confined to the
    adapter/CLI boundary.
  - Resolver relationship construction has one authoritative implementation.
  - CLI validation, querying, serving, watching, and diff behavior are covered by end-to-end tests for
    the intended behavior, including failure/reload paths.
  - Public API and package wiring document the deliberate breaking changes rather than preserving
    obsolete loading-oriented exports accidentally.
  - Architecture documentation and implementation paths remain aligned with the agreed building-block
    boundaries.
  - Update the solution-strategy prose and any affected building-block/deployment/decision text so it
    describes the pure core and separate filesystem adapter consistently.
  - Explicitly record the existing `zod` runtime dependency in the core as pre-existing technical
    debt or resolve it separately; do not silently claim that the refactor establishes a no-third-party
    runtime dependency policy.

## Implement — Slice 1: Source-neutral core contract

**Approach**: Refactor `arc42.ts` to accept source-neutral inputs (documents, path evidence) and return the model/edges/diagnostics without filesystem access.

**Key Decisions**
- The validator and facade use one source-neutral `ValidationContext` interface
- `Edge` type and construction moves from facade (`arc42.ts`) to resolver (`resolver/types.ts` + `resolver/index.ts`)
- `buildEdges` removed; resolver now produces `edges` as part of the `ReferenceIndex` return type
- `ValidationContext` has optional `pathEvidence` for implementation-path validation (source-neutral)
- Implementation-path rules consume only adapter-supplied `pathEvidence`; they do not resolve repository roots
- `arc42.ts` facade now accepts `{ documents, pathEvidence? }` and returns workspace/model/edges/diagnostics

### Tasks
- [x] Consolidate the validation API into one source-neutral `ValidationContext`
- [x] Move resolver-owned edge construction to authoritative source; remove duplicate `buildEdges`
- [x] Add `Edge` type to resolver types and make resolver the authoritative edge builder
- [x] Remove `dir`/`root` semantics from the core validation API; introduce `pathEvidence` for implementation-path rules
- [x] Split implementation-path rules: core rules consume optional path evidence, filesystem adapter supplies it
- [x] Keep `explain` in core as static guidance; add contract tests for it
- [x] Create in-memory contract tests for `buildWorkspace`, `buildIndex`, `validate`, `getElements`, `explain`
- [x] Update `arc42.ts` facade: replace filesystem pipeline with in-memory contract
- [x] Update public exports: `ValidateOptions`, `GetOptions`, and core entry points

### Completed
- **Key Decisions**
  - The validator and facade use one `ValidationContext` interface
  - `Edge` type and construction moves from facade (`arc42.ts`) to resolver (`resolver/types.ts` + `resolver/index.ts`)
  - `buildEdges` removed; resolver now produces `edges` as part of the `ReferenceIndex` return type
  - `ValidationContext` has optional `pathEvidence` for implementation-path validation (source-neutral)
  - Implementation-path rules consume only adapter-supplied `pathEvidence`
  - `arc42.ts` facade now accepts `{ documents, pathEvidence? }` and returns workspace/model/edges/diagnostics

## Implement — Slice 2: Filesystem workspace adapter

**Status**: Complete

### Completed
- Added the separate `@arc42/workspace-fs` package. It owns recursive `.arc42.md` discovery, file
  reading, parsing of acquired documents, and filesystem-derived path evidence.
- Removed filesystem discovery, file reads, and repository-root/path inspection from `@arc42/core`.
  Core implementation-path rules now evaluate only source-neutral normalized path evidence supplied by
  an adapter.
- Reconnected CLI `validate`, `get`, and `serve` through the filesystem adapter. Workspace directory
  selection, recursive file watching, debounce behavior, reload-error retention, SSE broadcasting, and
  static asset serving remain in the CLI.
- Preserved the `WorkspacePayload` fields and canonical element ordering (`elements`, `edges`,
  `diagrams`, `documents`) consumed by `@arc42/web`.
- Added adapter tests for recursive discovery, ordering, path evidence, and payload shape, plus CLI
  integration coverage for filesystem-backed validation and querying.
- Moved Git diff acquisition from the CLI into `@arc42/workspace-fs`; the adapter now acquires Git
  revisions, document contents, parsed ASTs, changed ranges, and known repository paths.
- The adapter discovers the nearest repository root from the selected workspace when no explicit
  `--root` is supplied, so repository-relative implementation paths continue to validate when the
  selected workspace is a subdirectory. An explicit root remains CLI-controlled and is passed through
  to adapter evidence acquisition.
- Kept CLI `prebuild` wiring for production bundling, but removed the CLI `pretest` build prerequisite.
  Core and filesystem adapter package exports now provide a `development` condition for TypeScript
  sources; package Vite test configs alias those sources, and CLI subprocess fixtures opt into the
  condition with `--conditions=development`. Production consumers still resolve the default `dist`
  exports, so build validation remains independent.
- Fixed the core facade to pass path evidence through the source-neutral validation context rather
  than treating the evidence object itself as validator options.

### Verification
- Core: 39 test files, 260 tests passed; check passed.
- Filesystem adapter: 2 tests passed; check and build passed.
- CLI: 5 test files, 27 tests passed; check passed, including a run with core and adapter `dist`
  directories temporarily absent.
- Workspace-fs: 1 test file, 2 tests passed without a build prerequisite; check passed, including the
  same clean-artifact run.
- CLI build passed, including the web asset build; documentation validation passed with 0 errors and
  0 warnings (7 non-blocking hints).

## Implement — Slice 3: Architecture diff acquisition boundary

**Status**: Complete

### Completed
- Kept `analyzeArchitectureDiff` in `@arc42/core` as a pure analyzer accepting current/base
  documents, changes, and optional `knownPaths`; it performs no Git or filesystem access.
- Moved Git revision resolution, patch/hunk parsing, revision document acquisition and parsing, and
  repository path-tree acquisition into `@arc42/workspace-fs`.
- Rewired the CLI `diff` command to select the workspace and present combined consistency/path
  findings while delegating acquisition to the filesystem adapter and analysis to core.
- Preserved the distinction between blocking consistency findings and non-blocking implementation
  path hints, including strict-mode behavior and `ARC42_CONSISTENT` acceptance.
- Added pure in-memory coverage proving consistency findings do not change when path evidence is
  supplied, adapter coverage for parsed Git revisions and path acquisition, and retained CLI
  integration coverage for consistency and path findings.

### Key Decisions
- The adapter returns parsed `DocumentAst[]` rather than raw revision text so the CLI remains a
  workspace-selection and presentation boundary.
- `knownPaths` remains optional at the core boundary: omitting it preserves source-independent
  path matching, while adapter-supplied tree evidence filters unresolved implementation paths.

### Verification
- Core tests: 39 files, 261 tests passed without a build prerequisite.
- Filesystem adapter tests: 2 files, 6 tests passed without a build prerequisite.
- CLI tests: 4 files, 22 tests passed without a build prerequisite.
- Core, filesystem adapter, and CLI checks passed after the adapter build refreshed its package export.

## Test Results

All 260 tests pass in the core package:

```
Test Files  39 passed (39)
     Tests  260 passed (260)
  Duration  662ms
```

Build completes successfully for core (`dist/index.mjs 179.58 kB`) and CLI (`dist/cli.mjs 366.47 kB`).

## Refactor Review Follow-up

The completed refactor review identified residual boundary and documentation issues. They are
resolved as follows:

- `Edge` is defined by the resolver and re-exported by renderer/core barrels; renderer no longer
  declares a structurally duplicate edge type. `decision.supersedes` now has the semantic
  `supersedes` relation rather than being mislabeled `addresses`.
- `ValidationContext` and `PathEvidence` are defined once in validator types. The validator accepts
  only that context; the old `ValidationOptions` name and bare `PathEvidence` compatibility union
  are removed. `LoadWorkspaceOptions` was unused and removed.
- Core uses a portable slash-normalizing basename helper instead of importing `node:path` for
  filename classification. Filesystem path acquisition remains in the adapter.
- Filesystem-backed validation/query/renderer integration tests live in `workspace-fs`; core tests
  use in-memory workspaces or source-neutral documents. Loading and query payload paths no longer
  run validation whose diagnostics they discard.
- The original no-runtime-dependencies decision is superseded by `dec-zod-runtime-debt`, with
  `risk-runtime-dependency` documenting the explicit remaining Zod dependency and its scope.

Verification for this follow-up: run the no-build test suites, package checks, production builds,
and strict architecture validation after the edits. Any failure is recorded with the final change
set rather than treated as a successful refactor by assumption.

### Follow-up implementation progress

- Removed the redundant `workspace-fs` renderer re-export files. Filesystem adapter code now reaches
  renderer behavior only through the public `@arc42/core` package export; no package source path is
  imported across the boundary.
- Replaced dynamic-import and source-layout tests with stable public-API behavior tests covering
  filesystem queries, resolved relationships, and text/JSON/Markdown output.
- Added a `development` condition to the core package export and removed Vite source aliases so these
  tests resolve source packages without requiring a prior build, while production resolution remains
  on `dist`.
- Clarified the Zod policy in the architecture decision and corrected the stale claim that every CLI
  command runs validation.
- Fixed package resolution across source checks, no-build tests, production builds, and installed CLI
  usage by declaring the development export condition in the CLI TypeScript project, consuming the
  workspace adapter through its package export, and retaining the default dist export for production.
- Added the `supersedes` relation to the web Edge contract, converted core implementation-path tests
  to in-memory path evidence, removed the empty workspace-fs renderer directory, and resolved the
  architecture validation hints with implementation paths and the missing diff diagram edge.
- Nested `bb-diff` inside the top-level `bb-core` Mermaid subgraph so the diagram explicitly declares
  the parent containment required by H019.

### Follow-up verification

- No-build behavior suites passed with core, workspace-fs, and CLI `dist` directories absent: core 37
  files/202 tests, workspace-fs 4 files/15 tests, and CLI 4 files/22 tests.
- Repository-wide `pnpm check` passed with no formatting, lint, or type errors; `pnpm test` passed with
  46 files and 242 tests.
- Production `pnpm build` passed for core, workspace-fs, web, and CLI; default package exports were
  smoke-tested through `@arc42/workspace-fs`, and the bundled CLI ran successfully with `--version`.
- Source validation passed through the package export using the `development` condition, and strict
  architecture validation passed with 0 errors, 0 warnings, and 0 hints.
- Workspace-fs Git fixture tests still print Git's expected `not a git repository` stderr while
  exercising non-repository behavior; the tests pass and no production behavior is affected.

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
