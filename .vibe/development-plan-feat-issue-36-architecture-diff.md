# Development Plan: arc42-language (feat/issue-36-architecture-diff branch)

*Generated on 2026-09-06 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Detect architecture-document changes that update only structured `:::blocks` or only
their surrounding prose, so pre-commit validation can identify documentation/model
inconsistency. The first increment should provide a deterministic CLI report and a
core API suitable for future web visualization.
## Key Decisions
- Issue #36 scope is consistency checking between changed prose and changed structured blocks; it does not compare implementation artifacts or infer semantic equivalence.
- Existing parser locations are the source of truth: blocks have start/end lines, prose has line locations, and `SourceLocation.prose` already associates prose immediately preceding a block.
- The current workspace must be compared with a Git base revision using ordinary `git diff` scope. The CLI should own Git/revision acquisition, while core receives normalized changed-file line ranges so the validator remains testable without a Git repository.
- Initial UX should be a dedicated `diff` command rather than changing ordinary `validate` behavior; validation remains deterministic and useful outside Git worktrees.
- A changed block is consistent only when its associated prose is also changed, and a changed prose section associated with a block is consistent only when that block is changed. Unrelated prose and blocks are not paired.
- Deleted blocks/prose are reported as changes but cannot be validated against the current AST; the initial implementation reports current-file consistency and leaves deleted-element semantic matching for a later increment.
- `arc42 diff` behaves like a Git-aware wrapper: without a reference it analyzes unstaged changes against the index; with a reference it compares that reference to the working tree, matching `git diff` and `git diff <reference>` scope. A non-Git workspace is a usage/environment failure and exits 1 with an explicit message.
- `--staged` and its Git-compatible alias `--cached` select index-versus-commit scope; they can be combined with a positional reference to match `git diff --cached [<reference>]`.
- Staged added files are included. The consistency check applies to new files as well as modified files.
- A changed heading counts as changed prose for the section it introduces. A section is paired with its block using the existing one-block-per-section convention.
- Findings are warnings but are commit-blocking by default (exit 1). Setting `ARC42_CONSISTENT` acknowledges the findings, preserves the findings in output, and allows exit 0 after manual review.
- Blocking consistency findings are rendered with warning severity, and a failed command prints the exact `ARC42_CONSISTENT=<base-sha>` acceptance value.
- The command should emit concise findings with file and line references; surrounding Git diff context is intentionally left to standard Git commands.
- “All typed blocks” means every recognized `:::<block-type>` model block (quality goals/scenarios, constraints, actors, strategies, building blocks, deployment nodes, interfaces, runtime scenarios, concepts, decisions, risks, and glossary terms); diagrams are separate AST artifacts and are not prose/block pairs.
- The optional reference follows Git's positional style: `arc42 diff [--staged|--cached] [<reference>]`; no flag compares the working tree with the index, while either staged alias compares the index with the selected commit.
- `arc42 diff --help` documents all change-set combinations and recommends `--staged`/`--cached` for pre-commit checks, where the index is the intended review scope.
- README examples now cover default, reference, staged/cached, help, and acceptance-token usage consistently with the CLI help.
- `ARC42_CONSISTENT` is an explicit acceptance token whose value must equal the selected commit base (resolved to a commit ID), rather than a generic boolean bypass. With no explicit reference, the comparison base is the index; the token remains meaningful only when a commit reference is supplied.
- Text output contains findings only, with stable file and line references; it does not replay Git patch hunks.
- Deleting both a block and its associated prose is accepted. Detecting that safely requires comparing old and new ASTs; a deletion of only one side remains a contradiction to report.
- A section is defined by a Markdown heading within one architecture-document file; chapter/file boundaries never combine sections. When a section contains multiple blocks despite W005, each block is analyzed independently against the section's changed prose.
- `ARC42_CONSISTENT=<resolved-base-commit>` suppresses only the non-zero exit caused by consistency findings. Git/revision errors, parser errors, and other command failures remain non-zero.
- The repository's own `docs/arc42` is a first-class dogfood target. Implementing this feature should update affected architecture prose and blocks together, especially the CLI/core building-block descriptions and the CI/agent-driven consistency strategy. Existing unchanged documentation is not re-linted by `arc42 diff`.
- The existing architecture intentionally has chapter 4 prose subsections beneath one chapter-level strategy block. Section-local pairing preserves that design: only the section containing that strategy block is paired; unrelated prose subsections are not falsely paired with it.
- The reviewed design is accepted. Acceptance criteria and final validation are performed in the Commit phase, after implementation and review rather than during planning.
- A second consistency signal covers implementation changes: changed repository paths are matched against `path` values on building-block and interface blocks. A matching file or descendant path emits an advisory hint naming the affected architecture element and asking the author to review its architecture; it does not replace prose/block consistency checking.
- Implementation-path matching uses repository-root-relative Git paths and the existing path normalization/root-resolution rules. Directory paths match descendants; file paths match the exact file. Both old and new architecture models participate so path changes, deletions, and renames are not silently missed.
- Code-path hints are non-blocking advisory findings. They are included in the affected diff/report and do not cause exit 1 by themselves; architecture prose/block contradictions remain commit-blocking.
- Code phase follows TDD: write a focused failing test for each behavior, implement the smallest passing change, then refactor while keeping the full suite green. Integration tests cover the CLI/Git boundary only after the pure core contracts are established.
- The implemented diff API keeps normalized ranges and consistency/path findings in core; the CLI remains responsible for Git invocation, working-tree/index/base content loading, findings rendering, and process exit policy.
- Default comparisons read current document contents from the working tree and base document contents from the index; reference comparisons read the working tree against the selected commit. This keeps document contents and changed ranges aligned with ordinary Git diff scope.
- Architecture path matching is component-based and supports directory descendants plus extension-bearing exact file paths. Hints are deduplicated per architecture element and changed path and remain non-blocking.
- Follow-up review decision: implementation-path matching must be based on normalized Git/index/base paths, not live working-tree existence, so staged deletions/renames remain deterministic. File-versus-directory semantics must not be inferred solely from a dot in the final path component.
- Follow-up review decision: Git pathname parsing must support spaces, quoting, and special characters through a machine-readable or correctly unquoted path boundary shared by hunk parsing and rendering.
- Git-tree path semantics are supplied by the CLI as the union of staged-index and selected-base paths. An authored path is an exact file only when it exists as a tree entry; otherwise it is a directory only when tree entries exist below it. Unresolved paths produce no impact hint.
- The `--dir` workspace scope filters current and base architecture documents by repository-relative path, while code-path matching still uses the full repository tree. Git pathname octal byte escapes are decoded as UTF-8 bytes, not Unicode code points.
- Implementation-path findings are advisory file-level hints: they list affected repository files but do not include their full code diff. Only consistency findings contribute filtered diff hunks to the output.
- Consistency errors and implementation-path hints are both reported as concise findings; no Git patch hunks are printed by default.
- The CLI does not print Git patch hunks by default; findings retain file and line references, and authors can use Git directly when surrounding context is needed.
- Follow-up issue #44 keeps the root help focused on command purposes and moves command syntax, options, defaults, environment variables, and exit behavior into consistent subcommand help.

## Notes
- Issue #36 is open and requests: use `git diff` to detect changes, analyze affected AST nodes, and check whether blocks and prose are both modified; web diff visualization is a follow-up concern.
- `discoverFiles` loads only `*.arc42.md`; the existing `DocumentAst` preserves file paths and line locations for headings, prose, and blocks.
- `buildWorkspace` associates prose with the next block after the nearest heading and resets the association after each block. This is sufficient for a first changed-pair report, but the diff implementation should use AST node ranges directly rather than relying only on rendered model fields.
- No `.vibe/docs/requirements.md`, `.vibe/docs/architecture.md`, or `.vibe/docs/design.md` exists. The plan is the durable record for this feature.
- Core uses Node.js built-ins and has no Git library dependency. The CLI already owns command dispatch and can invoke Git through a small adapter.
- Existing validation diagnostics have only `code`, `severity`, `message`, `file`, and `line`; a diff result may need a separate result type because consistency findings are not ordinary model validation errors.
- The plan is the durable design record because no project design document exists; implementation should follow the boundaries and contracts below rather than adding Git concerns to the parser or validator.

### Open questions
*None remaining for the Explore phase.*

## Explore
### Tasks
- [x] Read issue #36 and separate the required prose/block consistency check from the optional web visualization.
- [x] Inspect parser AST, model locations, prose association, workspace loading, CLI dispatch, and test conventions.
- [x] Confirm that no requirements, architecture, or design document exists.
- [x] Identify the Git boundary: CLI/repository adapter obtains diffs; core analyzes normalized changed ranges.
- [x] Confirm ordinary Git diff scope by default and optional-reference diff semantics.
- [x] Resolve new-file inclusion, same-section pairing, changed-heading behavior, blocking warning behavior, acceptance override, CLI command, text diff output, and block coverage.
- [x] Confirm Git-style positional reference syntax, commit-valued acceptance, affected-hunk-only text output, and acceptance of paired deletion.
- [x] Resolve multiple-block pairing and confirm acceptance override scope.

### Completed
- [x] Created development plan file

## Plan
### Tasks
- [x] Choose and document the exact diff input contract: ordinary working-tree changes by default (`git diff`), optionally against a positional reference (`git diff <reference>`), restricted to discovered `*.arc42.md` files after Git acquisition.
- [x] Define the core diff result and diagnostic/report format, including changed files, old/new changed ranges, block/prose pairing, and deleted content behavior.
- [x] Decide that consistency findings are warnings with commit-blocking exit behavior by default, and define the commit-valued acceptance override and operational-error behavior.
- [x] Design the smallest parser/model extension needed to expose stable prose and block ranges without breaking existing validation: reuse heading/prose/block AST locations and add normalized change-range/result types at the diff boundary rather than changing ordinary validation diagnostics.
- [x] Plan unit, integration, CLI, and fixture coverage for prose-only, block-only, both-changed, unrelated-change, changed-heading, new-file, paired-deletion, one-sided-deletion, multi-block, multi-file, non-Git, bad-reference, and acceptance-token cases.
- [x] Present the architecture/design options and obtain review before moving to Code.

### Completed
- [x] Defined Git acquisition and normalized-change boundaries.
- [x] Defined consistency algorithm, result shape, output filtering, and exit semantics.
- [x] Defined test matrix and edge-case coverage.

### Own-architecture impact
- The feature adds a Git-aware diff capability at the CLI boundary and a normalized change-analysis capability in core; it does not make the parser or ordinary validator Git-aware.
- `docs/arc42/05-building-blocks.arc42.md` will need its CLI and core descriptions kept aligned with the new command and analysis responsibility. If the change introduces a new conceptual building block, its prose and block must be added in the same section.
- `docs/arc42/04-solution-strategy.arc42.md` should continue to describe prose as the narrative and typed blocks as verifiable facts; the new command operationalizes that strategy rather than changing it.
- CI/agent guidance can mention `arc42 diff`, but a prose-only change in a section with a block will intentionally fail until its block is updated too. This is the desired dogfooding behavior.
- Templates and examples are also eligible architecture documents when they are part of the selected Git diff. The command does not force unrelated historical cleanup in those documents.
- Code changes under modeled building-block/interface paths are also relevant output, even though they are not architecture documents; only their affected Git hunks are shown alongside the advisory hint.

### Design

#### Recommended boundaries
1. **Git adapter (CLI boundary):** resolves the repository, selected base commit, ordinary working-tree diff, file statuses, and old/new patch ranges. It owns Git command failures and never enters parser or model code.
2. **Document loader/parser:** parses the relevant old and new `*.arc42.md` contents independently. It remains unaware of Git and continues to provide headings, prose, typed blocks, and source ranges.
3. **Core diff analyzer:** receives normalized per-file old/new change ranges and document ASTs. It maps changes to heading sections, evaluates every block independently, and returns structured findings plus affected ranges.
4. **Renderer/CLI policy:** filters the patch to hunks touching a relevant block or its same-section prose, prints findings, and computes the process exit code. It does not decide whether prose semantically matches a block.

#### Change and pairing rules
- A section is keyed by document file and its Markdown heading boundary; changes never pair across files or headings.
- A block is affected when its source range overlaps a new-side changed range; its associated section prose is affected when prose or the section heading overlaps a new-side changed range.
- For old-side deletions, the analyzer uses the old AST and old ranges. A block and its associated prose deleted together produce no contradiction; deleting only one side produces a finding.
- Added files are analyzed as new documents. Their typed blocks require changed associated prose in the same section; a block-only addition is inconsistent.
- If a section contains multiple blocks, each block is evaluated independently against the section prose. Existing W005 remains responsible for the structural warning.
- Unrelated changes do not produce findings or appear in the filtered diff output.

#### Implementation-path impact rules
- Build a path index from current and base building-block/interface elements that have authored implementation paths.
- For each changed repository file, compare its root-relative path with modeled paths using normalized path components. Exact file matches and descendants of modeled directories are affected; textual prefixes and unrelated paths are not.
- Emit one stable advisory hint per affected architecture element and changed path, including the element identity, modeled path, and changed implementation path. Deduplicate overlapping matches for the same element/path pair.
- A path-change hint is emitted whether or not the corresponding architecture section also changed. If the section changed, the normal prose/block consistency check runs independently.
- Missing or unresolved authored paths are handled by existing path validation; they do not create an implementation-impact match.

#### Result and exit contract
- The core returns a deterministic result containing affected file/range entries, findings with file/line/section/block context, and whether consistency findings exist. It does not return a process exit code.
- Findings identify one contradiction per affected block/prose pair, with stable ordering by file, line, and finding kind.
- The CLI prints findings only; Git output is intentionally not replayed so the report stays concise.
- No findings exits 0. Findings exit 1 unless `ARC42_CONSISTENT` resolves exactly to the selected base commit. Git, revision, parsing, and other operational failures always exit 1.
- The first increment uses text output; the structured core result remains suitable for a future JSON/web renderer without making visualization part of this change.
- Advisory implementation-path hints do not make the command fail. The acceptance override applies only to commit-blocking consistency findings, not to operational errors.

#### Alternatives rejected
- **Modify ordinary `validate`:** rejected because consistency is Git/change-context dependent and ordinary validation must remain usable without a repository.
- **Let core invoke Git:** rejected because it makes core tests repository-dependent and couples document analysis to process execution.
- **Compare only rendered model objects:** rejected because deleted content, headings, and exact source ranges require old/new AST and patch information.
- **Emit the full repository diff:** rejected because unrelated code/config changes obscure the architecture consistency report.

## Code
### Tasks
- [x] **Red — core change contract:** add failing unit tests for normalized old/new change ranges, section-local prose/block pairing, block-only/prose-only/both-changed cases, changed headings, unrelated sections, new files, paired deletion, one-sided deletion, multiple blocks, and deterministic finding order.
- [x] **Green — core change analyzer:** implement the smallest pure analyzer that consumes ASTs plus normalized ranges and returns structured consistency findings and affected ranges without invoking Git.
- [x] **Refactor — core contract:** isolate range overlap, section mapping, deletion handling, and finding ordering into composable helpers; preserve existing validation and diagnostics APIs.
- [x] **Red — implementation-path impact:** add failing unit tests for exact file matches, directory descendants, path-component boundaries, file/directory non-matches, multiple affected elements, old/new path changes, renames, deduplication, and missing/unresolved paths.
- [x] **Green — implementation-path impact:** add pure path-impact analysis over old/current building-block and interface models, producing non-blocking advisory hints and affected code ranges.
- [x] **Red — Git adapter and CLI:** add foundational integration tests for ordinary working-tree behavior, positional base references, and non-Git directories; the broader CLI acceptance matrix remains a Commit-phase validation task.
- [x] **Green — Git adapter and CLI:** implement Git acquisition, old/new document loading, changed-path normalization, `diff` dispatch, text rendering, and exit policy while keeping Git concerns outside core analysis.
- [x] **Refactor — end-to-end behavior:** consolidate report rendering, ensure stable output, update CLI help/README and the repository architecture documentation, then run the complete existing suite.
- [x] **Review gate:** reviewer-agent review completed; the dedicated reviewer model was unavailable, so a general review agent performed the review. It identified file-wide hunk filtering and unresolved-path matching defects; both were fixed and verified with check/build/tests.
- [x] **Review follow-up:** replaced live filesystem path checks with staged/base Git-tree-aware matching, defined robust file/directory path semantics, and supported quoted Git paths.
- [x] **Review follow-up tests:** added coverage for Git-tree file/directory/unresolved matching and quoted Git path headers. The broader CLI acceptance matrix remains a Commit-phase validation task.

### Completed
- [x] Added pure core diff analysis with normalized old/new ranges, section-local pairing, deletion handling, deterministic findings, affected-range filtering, and implementation-path hints.
- [x] Added ordinary Git diff acquisition, base-commit resolution, architecture-document loading, `diff` CLI dispatch, concise findings rendering, advisory hint severity, and acceptance-token exit behavior.
- [x] Added core and CLI tests, updated CLI/architecture documentation, ran reviewer review, fixed review findings, and verified formatting, types, tests, builds, and documentation validation.
- [x] Final review follow-up fixed workspace scoping and UTF-8 Git pathname decoding; final validation passes with 234 tests.

## Commit
### Tasks
- [x] Validate acceptance criteria, including ordinary working-tree and positional-reference behavior, findings output, all consistency cases, non-Git/operational failures, and `ARC42_CONSISTENT=<base-commit>` behavior.
- [x] Validate implementation-path impact: changed code beneath modeled building-block/interface paths produces non-blocking hints, while unrelated code produces none.
- [x] Dogfood the command against the repository's own `docs/arc42` changes and verify the related prose/block updates are consistent.
- [x] Run cleanup, documentation review, reviewer-agent follow-up, and full validation.
- [x] Record final decisions and create the feature commit.

### Completed
- [x] Acceptance behavior validated through the full automated suite and repository dogfood: architecture changes emit only relevant hunks, while implementation-path changes emit file-level advisory hints without code diffs.
- [x] Dogfooding exposed a missing synchronized CLI/core block update in `docs/arc42/05-building-blocks.arc42.md`; the architecture prose and block titles/paths were updated together, and `arc42 diff --dir docs/arc42` now exits 0.
- [x] Implementation-path output was narrowed so path hints contribute affected-file findings only; they no longer cause the full code diff to be rendered.
- [x] Manual comparison against `main` confirmed that clean architecture changes produce only file-level implementation hints; consistency hunks are reserved for actual blocking errors and errors are printed before hints.



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
