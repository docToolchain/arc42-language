# Development Plan: arc42-language (fix/arc42-consistent-diff-acceptance branch)

*Generated on 2026-09-07 by Vibe Feature MCP*
*Workflow: [bugfix](https://codemcp.github.io/workflows/workflows/bugfix)*

## Goal
Fix `arc42 diff` acceptance handling so `ARC42_CONSISTENT` acknowledges only the
comparison it actually ran, while every reported finding includes the advertised
acceptance guidance required by the existing CLI help.
## Key Decisions
- Preserve the intended meaning of `ARC42_CONSISTENT`: it is an explicit
  acceptance token tied to the selected comparison base, not a generic boolean
  bypass.
- When the token matches, findings remain visible as accepted warnings/hints,
  the message `These changes were accepted as intentional` is printed, and the
  command exits successfully, including strict path-hint findings. A token matching `HEAD`
  must not accept a default working-tree comparison when the index is a
  different base.
- Accepted findings remain visible as warnings/hints, and the CLI prints an
  informational `These changes were accepted as intentional` message while
  treating them as non-blocking.
- Do not change help text or acceptance semantics during reproduction; first
  capture the observed failures in executable tests.

## Notes
*Additional context and observations*
- Environment: macOS, Node.js test runner via `pnpm test`/Vite Plus. The
  reproduction uses temporary Git repositories, so it is independent of the
  developer checkout's current files.

## Reproduce
### Tasks
- [x] Add a CLI regression test for a failing consistency diff and verify that
  the output currently omits `ARC42_CONSISTENT` guidance.
- [x] Add a CLI regression test where the environment token is the repository
  `HEAD`, but the default working-tree comparison uses a changed index; verify
  that the current CLI incorrectly exits 0.
- [x] Add a CLI regression test for a path-hint-only diff and verify that the
  strict command currently exits 1 and omits `ARC42_CONSISTENT` guidance.
- [x] Add a CLI regression test for the requested strict invocation with
  `ARC42_CONSISTENT=<base commit>`; verify that the current CLI still exits 1
  and still prints the hint instead of accepting and omitting it.

### Completed
- [x] Created development plan file
- [x] Reproduction tests are in `packages/cli/tests/diff-cli.test.ts`.
- [x] Tests reproduced two failures: the acceptance advertisement is missing
  for consistency and hint-only findings, and a token for `HEAD` incorrectly
  accepts a default comparison against a different index state.
- [x] Focused reproduction run: `pnpm test -- packages/cli/tests/diff-cli.test.ts`
  reports 4 tests with 3 expected failures. The requested strict acceptance
  test currently exits 1 and still prints the hint; the mismatched-commit test
  currently exits 0; and the strict hint-only test has no acceptance guidance.

## Analyze
### Tasks
- [x] Trace comparison-base selection in `collectGitDiff`.
- [x] Trace acceptance, output, and strict exit handling in `runDiff`.
- [x] Distinguish consistency findings from path-hint findings in the core
  diff result.
- [x] Record the implementation change required to make an accepted strict
  diff silent and successful.

### Completed
- `collectGitDiff` always sets `diff.base` to `git rev-parse <reference ??
  HEAD>`. For the default command, however, `git diff` compares the working
  tree to the index, and `baseDocuments` are read from `:` (the index). Thus
  `diff.base` is only a valid commit acceptance identity when the index still
  equals `HEAD`; with staged changes, a `HEAD` token can incorrectly accept a
  different comparison.
- `runDiff` prints every finding before evaluating `ARC42_CONSISTENT`. The
  token currently gates only `result.hasBlockingFindings`, which represents
  consistency findings. Path hints are separate (`result.pathFindings`) and
  remain printed even after acceptance.
- Strict mode independently computes `hasStrictFindings` from all printed
  hint findings and forces exit 1. Therefore a matching token cannot currently
  make the requested `--strict` invocation exit 0.
- The acceptance guidance is emitted only when
  `result.hasBlockingFindings && !accepted`, so hint-only diffs never print
  the guidance needed to discover the acceptance mechanism.
- Required fix shape: determine whether the selected comparison has a valid
  commit base, compute acceptance before determining status, keep accepted
  findings visible, and apply strict failure only when hints remain
  unaccepted. Emit the acceptance guidance whenever unaccepted findings exist.

### Key Decisions
- `ARC42_CONSISTENT` accepts the complete diff result, not only consistency
  findings. A matching token therefore keeps consistency findings and path
  hints visible as accepted output while making `--strict` exit 0.
- The default unstaged comparison is working tree versus index. A commit token
  must not accept it when the index differs from the token's commit; acceptance
  eligibility must account for that distinction rather than treating `HEAD`
  as the base unconditionally.
- Keep the token value commit-oriented for the normal clean-index case and
  explicit reference/staged comparisons, because that matches the existing
  CLI contract and the requested `ARC42_CONSISTENT=<based commit>` usage.
- Keep this fix targeted to the CLI/Git comparison boundary. The core finding
  model remains unchanged; the blast radius is limited to acceptance identity,
  finding rendering, and the diff command's exit code.

## Fix
### Tasks
- [x] Compute acceptance eligibility from the actual comparison mode/base.
- [x] Keep accepted findings visible and ensure accepted strict diffs exit 0.
- [x] Print acceptance guidance for every unaccepted finding category.
- [x] Preserve the requested default failure behavior and existing operational
  error handling.

### Completed
- Added `acceptanceBase` to the Git diff result. For a default unstaged diff,
  it is available only when the index matches `HEAD`; explicit references and
  staged comparisons retain their resolved commit base. This prevents a `HEAD`
  token from accepting a working-tree diff whose actual base is a changed
  index.
- `runDiff` now evaluates acceptance before rendering findings. A valid
  matching token keeps all findings, including path hints, visible, prints an
  informational `These changes were accepted as intentional` message, and
  prevents strict mode from failing. Any
  unaccepted finding prints the acceptance guidance, while strict mode fails
  only when unaccepted hints remain.
- Acceptance requires a defined comparison base, preventing an unset
  `ARC42_CONSISTENT` variable from being treated as an acceptance token.
- Blast-radius assessment: this is a minimal boundary fix. It leaves the core
  diff analyzer and operational error handling untouched and changes only
  acceptance identity, output suppression, and related exit status.

## Verify
### Tasks
- [x] Run focused CLI acceptance tests.
- [x] Run the relevant CLI/core regression tests and static checks.

### Completed
- Focused acceptance regression suite: `pnpm test --
  packages/cli/tests/diff-cli.test.ts` — 4 tests passed.
- Relevant CLI/core regression suites: `pnpm test --
  packages/cli/tests/git-diff.test.ts packages/cli/tests/help.test.ts
  packages/core/tests/diff.test.ts` — 17 tests passed. The expected temporary
  repository fixture emits a harmless `fatal: not a git repository` diagnostic
  while exercising CLI error handling; the suite passes.
- Static checks: `pnpm run check` — all 213 files formatted; no warnings, lint
  errors, or type errors.
- Full test suite: `pnpm test` — 43 test files and 283 tests passed. The same
  expected fixture diagnostic appears, without affecting the result.
- Verification confirms that the original three regressions are fixed and no
  existing regression was introduced in the exercised CLI/core behavior.

## Finalize
### Tasks
- [x] Review changed code for temporary debugging artifacts and unresolved TODOs.
- [x] Review documentation and confirm whether the design document requires an update.
- [x] Run final validation after cleanup and record the production-readiness result.

### Completed
- Code cleanup review completed. The `console.log` calls in the CLI are
  intentional user-facing command output, not investigation artifacts; no
  temporary debug statements, commented-out code, or unresolved TODO/FIXME
  items were introduced by this fix.
- `.vibe/docs/design.md` does not exist in this repository, so no design
  document update was required. The final behavior and decisions are recorded
  in this development plan.
- Final validation is covered by the completed Verify runs: focused acceptance
  tests (4 passed), relevant CLI/core regression tests (17 passed), static
  checks (213 files formatted with no warnings, lint errors, or type errors),
  and the full suite (283 tests passed).
- The implementation is ready for production review. The unrelated existing
  change in `packages/core/src/ast.ts` remains untouched.
- Follow-up refinement: accepted findings remain visible and are accompanied by
  an `info These changes were accepted as intentional` message, while their
  exit-status effect remains suppressed.



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
