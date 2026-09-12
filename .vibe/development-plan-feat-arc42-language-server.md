# Development Plan: arc42-language (feat/arc42-language-server branch)

*Generated on 2026-09-11 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Provide one trustworthy, minimal stdio E2E smoke test for the language server.
## Key Decisions
- Use the real server subprocess and LSP wire framing, not a mock or in-process harness.
- Buffer Content-Length payloads as bytes so UTF-8 length is correct across chunk boundaries.
- Test only initialize, initialized, shutdown, exit, timeouts, and deterministic cleanup.
- Keep NodeNext `.js` specifiers for built output generally, but use `.ts` specifiers at the server source entry boundary so Node's direct type-transform runtime can resolve source E2E imports. The bundler rewrites these imports for `dist/server.mjs`, so source and built E2E paths both remain runnable.
- The next milestone is a Zed-testable MVP: stable executable, synchronization, core diagnostics with useful ranges, and context-aware completion.
- Use vertical TDD slices: add a failing real-subprocess E2E test, implement the smallest change, run focused tests, then run regression checks.
- Package the stdio server entrypoint itself (`src/server.ts`) so the published `bin` target is rebuilt as `dist/server.mjs`.

## Notes
*Additional context and observations*

## Explore
### Tasks
- [ ] *Tasks will be added as they are identified*

### Completed
- [x] Created development plan file

## Plan
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Code
### Tasks
- [x] Replace the oversized stdio test with a canonical real-process smoke suite.
- [x] Make stdio framing byte-correct and await request/process shutdown.
- [x] Remove duplicate CLI LSP mock contract/harness/spec artifacts and script.
- [x] Run focused server tests and repository tests; record pre-existing server check failures.
- [x] Fix source E2E resolution by using Node's type-transform runtime with `.ts` source imports while preserving bundled output resolution.
- [x] Add failing synchronization tests and implement versioned full/incremental document synchronization, stale-update rejection, close cleanup, and UTF-16/CRLF/Unicode range application.

### Completed
- [x] Canonical smoke suite and server framing implementation completed.
- [x] Packaged-entrypoint lifecycle E2E test passes; the server build now emits the declared `bin` target.
- [x] Focused E2E, server build, and server `check` pass for the packaged lifecycle slice.
- [x] Removed abandoned CLI LSP implementation, duplicate parser range processor, unused server range utilities, and generated server tarball.
- [x] Add packaged-entrypoint lifecycle E2E test, then make the built `bin` command pass.
- [x] Add full/incremental document synchronization and versioning tests, then implement the document store.
- [x] Add diagnostics publication/clearing E2E tests, then connect core validation and range conversion.
- [x] Add workspace overlay/revalidation tests for unsaved cross-file documents and revalidate discovered documents against open overlays.
- [x] Align server test tooling dependency placement with the workspace convention so `vite-plus/test` resolves during checks.
- [ ] Add context-aware completion E2E tests and connect schema metadata.
- [ ] Add Zed configuration and a manual fixture-workspace smoke checklist.
- [ ] Run the complete MVP release gate and document remaining non-MVP limitations.

### Synchronization decisions
- Document state is keyed by URI and stores the latest text plus LSP document version.
- Full changes replace the complete text; incremental changes are applied in order against the current text.
- Changes with a version less than or equal to the stored version are ignored.
- Range offsets use JavaScript string indices, which represent LSP UTF-16 positions, and preserve existing line endings.

### Zed-testable MVP acceptance criteria
- Zed launches the built server using one documented command without a development-only runner.
- Opening an invalid `.arc42.md` produces a correctly ranged diagnostic.
- Correcting the document clears the diagnostic.
- Full and incremental edits update state without stale results.
- Completion offers arc42 block types in the relevant context.
- The stdio E2E suite covers framing, initialization, synchronization, diagnostics, completion, and clean shutdown.

### TDD implementation order
1. Add a failing packaged-entrypoint lifecycle test; fix build output and executable configuration.
2. Add failing synchronization tests for open, full change, incremental change, close, stale versions, CRLF, and Unicode; implement the versioned document store.
3. Add failing diagnostics tests for invalid/valid open and change; implement core validation and LSP diagnostic conversion/clearing.
4. Add failing workspace-overlay tests; implement discovery, unsaved overlays, and affected-document revalidation.
5. Add failing completion tests for block, attribute, and value contexts; connect schema metadata and safe malformed-input handling.
6. Add Zed configuration/manual smoke documentation; verify interactively against a fixture workspace.
7. Run focused E2E tests, all tests, build, and check; only then mark the MVP complete.

### Diagnostics slice result
- [x] The packaged stdio server validates opened and changed documents through `@arc42/core`.
- [x] `textDocument/publishDiagnostics` includes URI, zero-based LSP ranges, severity, and stable rule codes; valid changes publish an empty list to clear findings.
- [x] Queued-notification E2E coverage verifies invalid open, valid replacement, and diagnostic clearing.

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
