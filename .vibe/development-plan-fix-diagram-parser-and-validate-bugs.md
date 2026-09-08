# Development Plan: arc42-language (fix/diagram-parser-and-validate-bugs branch)

*Generated on 2026-09-08 by Vibe Feature MCP*
*Workflow: [bugfix](https://codemcp.github.io/workflows/workflows/bugfix)*

## Goal
Fix diagram discovery so only diagram metadata inside an `arc42` fence becomes a
diagram artifact, and make deployment Mermaid syntax errors visible through
`arc42 validate`.
## Key Decisions
- The parser fix is intentionally strict: an unwrapped `:::diagram` is a normal
  block, not diagram metadata. This prevents prose/examples containing that
  marker from changing the document model. Existing authored documents should
  wrap diagram metadata in ` ```arc42 ` fences.
- Deployment syntax validation remains a bounded, synchronous validator owned by
  the core package. Rather than pulling the web renderer's Mermaid runtime into
  the validator, every non-empty, non-comment line in `architecture-beta` source
  must match the supported group, service, or edge grammar.
- Blast radius is moderate: the parser change affects documents with unwrapped
  diagram metadata; this is the intended format correction. The validator
  change is additive and reports previously ignored malformed lines as E010.
- Reviewer follow-ups were accepted: W016 documentation and test naming now
  describe the non-exemption correctly, the deployment fixture closes its
  enclosing `arc42` fence, and the starter template retains its staging example
  with balanced fences.

## Notes
- The repository's CLI and validation script console output is intentional
  user-facing behavior, not temporary debugging output.

## Reproduce
### Tasks
- [ ] *Tasks will be added as they are identified*

### Completed
- [x] Created development plan file

## Analyze
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Fix
### Tasks
- [x] Restrict diagram metadata parsing to ` ```arc42 ` fences.
- [x] Report unrecognized deployment Mermaid source lines as E010 diagnostics.
- [x] Add regression coverage for both reported bugs.

### Completed
- [x] Implemented parser and deployment validator fixes with regression tests.

## Verify
### Tasks
- [x] Run the core regression suite.
- [x] Run formatting, lint, and type checks.
- [x] Build packages and run strict validation for first-party docs/examples.

### Completed
- [x] `pnpm --filter @arc42/core test`: 42 files, 220 tests passed.
- [x] `pnpm test`: 51 files, 260 tests passed.
- [x] `vp check --fix` completed with no warnings, lint errors, or type errors.
- [x] `pnpm run build` passed.
- [x] `pnpm run validate:all` passed (docs: 0 errors; examples: 0 errors, existing 5 hints).
- [x] Final `pnpm test`: 51 files, 260 tests passed.

## Insights
- Deployment diagrams use both Mermaid port edges such as `id:R -- L:target`
  and arrow edges. The bounded validator accepts both while still rejecting
  lines that match no supported architecture construct.
- Diagram metadata fences are now part of the canonical document format, so
  first-party docs, examples, and starter templates were migrated accordingly.

## Finalize
### Tasks
- [x] Review changed implementation for temporary debug output, TODO/FIXME markers, and commented-out development code.
- [x] Review documentation impact and record the final design decisions.
- [x] Run final tests, checks, build, and first-party validation after cleanup.

### Completed
- [x] Cleanup scan found no development-only debug statements or TODO/FIXME
  markers in the changed implementation. Existing CLI and validation-script
  console calls remain because they provide intentional command output.
- [x] `.vibe/docs/design.md` does not exist; the refined parser and validator
  behavior is documented here under Key Decisions and Insights.
- [x] Final validation passed: `pnpm test` (51 files, 260 tests), `pnpm run
  check`, `pnpm run build`, and `pnpm run validate:all` (docs: 0 errors;
  examples: 0 errors, 5 pre-existing hints).
- [x] Independent reviewer re-check found and the implementation corrected
  three additional unbalanced deployment test fixtures; all diagram fixtures
  now model the canonical separated `arc42` metadata and Mermaid source fences.
- [x] Post-review validation passed: `pnpm test` (51 files, 260 tests),
  `pnpm run check`, and `git diff --check`.



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
