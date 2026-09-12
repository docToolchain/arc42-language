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

### Completed
- [x] Canonical smoke suite and server framing implementation completed.
- [x] Focused E2E and repository tests pass; server `check` remains blocked by existing LSP type/lint issues.
- [x] Removed abandoned CLI LSP implementation, duplicate parser range processor, unused server range utilities, and generated server tarball.

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
