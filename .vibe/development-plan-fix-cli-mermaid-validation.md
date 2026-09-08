# Development Plan: arc42-language (fix/cli-mermaid-validation branch)

*Generated on 2026-09-08 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Expose real Mermaid parser validation through the CLI while retaining the
arc42-specific semantic checks for model references, aliases, and deployment
scope.
## Key Decisions
- Use Mermaid's real parser for syntax validation rather than extending the
  project's hand-written regex grammar.
- Keep Mermaid parsing separate from arc42 semantic validation: parser errors
  become E010/E012/E013/E014 diagnostics, while core rules continue checking
  model consistency and deployment semantics.
- Mermaid `11.17.2` already brings in `@mermaid-js/parser 1.2.1`; verify direct
  package ownership and API usage before introducing a second parser dependency.
- The parser API requires a diagram type (`architecture`, `sequence`, or
  `flowchart`) and returns parser-specific ASTs. The integration should expose
  project-owned plain results rather than leak parser internals.
- Introduce a dedicated `packages/mermaid` adapter with a direct
  `mermaid` dependency. This makes parser ownership explicit and avoids
  relying on the web package's transitive dependency.
- Keep the first implementation as a pragmatic hybrid: core consumes the
  adapter for syntax parsing, while core retains ownership of arc42 semantic
  rules. A full validator-plugin architecture is deferred because it would
  require a larger rule-registration refactor.
- Do not import the full browser-oriented `mermaid` renderer into core or the
  CLI at startup. The adapter is Node-compatible and loads Mermaid lazily only
  when a diagram is parsed, keeping help and non-validation commands fast.
- The standalone `@mermaid-js/parser 1.2.1` API currently exposes architecture
  parsing but not sequence or flowchart parsing. Use Mermaid's production
  `parse` API behind the adapter for all three supported notations instead of
  maintaining two parser implementations.
- Avoid duplicate parser diagnostics when an existing semantic rule already
  reports the same code, file, and diagram line.
- Keep Mermaid external in the CLI bundle and declare it as a runtime package
  dependency; bundling Mermaid changes its DOMPurify behavior in Node.
- When Mermaid's Node sanitizer is unavailable for flowchart/sequence labels,
  retry a structural parse with presentation text removed. The original source
  is always attempted first.
- Keep renderer transformations notation-aware: `architecture-beta` accepts
  architecture edges but not flowchart `click ... href ...` directives.
- Validate every recognized Mermaid notation, including empty sources and
  generic/class diagrams, rather than only diagrams with specialized semantic
  rules. Anonymous Mermaid fences are parsed with Mermaid's auto-detection.
- Treat empty source as the chapter-0 structural diagram error (E008) and
  suppress notation-specific parser diagnostics for that same diagram.
- Run Mermaid syntax parsing before semantic Mermaid rules and suppress all
  notation-specific semantic findings for a diagram whose syntax is invalid;
  this leaves one actionable syntax error instead of a cascade.
- Regression coverage asserts the same single-diagnostic behavior for a
  non-empty malformed deployment diagram.
- Documented the Node-only flowchart fallback's reason, scope, and known
  limitation directly beside the workaround.

## Notes
- The sample in `docs/arc42/07-deployment-view.arc42.md` contains two
  `architecture-beta` diagrams. Both parse successfully with the real Mermaid
  parser, including port edges such as `npm_packages:R -- L:documentation_workspace`.
- The runtime-view sequence sample and flowchart/context samples also parse
  successfully according to the capability check.
- The current CLI already executes the registered Mermaid-related core rules;
  the missing capability is real syntax parsing, plus CLI-level regression
  coverage proving parser diagnostics survive the build artifact path.
- No `.vibe/docs/requirements.md`, `.vibe/docs/architecture.md`, or
  `.vibe/docs/design.md` exists. The architecture and design decisions for
  this increment are therefore recorded in this plan.

## Explore
### Tasks
- [x] Identify Mermaid and `@mermaid-js/parser` versions and package ownership.
- [x] Validate the deployment sample with the real Mermaid parser.
- [x] Validate representative sequence and flowchart samples.
- [x] Document package-boundary and CLI integration implications.

### Completed
- [x] Created development plan file
- [x] Capability research confirmed Mermaid `11.17.2` and parser `1.2.1`.
- [x] Both deployment diagrams in chapter 7 parse successfully as
  `architecture` diagrams; parser support for `architecture-beta` is present.
- [x] Research found no need for a second Mermaid implementation, but a direct
  dependency or dedicated adapter boundary may still be needed because the
  parser is currently only transitively available through the web package.

## Plan
### Tasks
- [x] Define the package boundary and dependency direction.
- [x] Define the parser adapter API and error normalization contract.
- [x] Define the migration order for existing Mermaid rules and utilities.
- [x] Define CLI/build-artifact and regression-test coverage.
- [x] Identify compatibility, versioning, and malformed-input edge cases.

### Completed
- [x] Planned dependency graph: `core → @arc42/mermaid → @mermaid-js/parser`;
  CLI continues to consume core, and web keeps full Mermaid rendering isolated.
- [x] Planned adapter API: parse source by notation and return a project-owned
  success/error result; expose only stable plain data needed by semantic rules.
- [x] Planned staged migration: adapter tests first, compatibility shim for
  `mermaid-utils`, then E010/E012, then E013/E014 and related rules.
- [x] Planned CLI tests for invalid architecture, sequence, and flowchart
  syntax, including JSON output and the built `dist` executable.
- [x] Planned safeguards for parser exceptions, unsupported notation,
  empty/comment-only diagrams, multiline labels, aliases, ports, nested
  groups, and parser-version drift with the web renderer.
- [x] No architecture/design document needed updating because the expected
  `.vibe/docs` documents are absent; decisions are recorded above.

## Code
### Tasks
- [x] Add the `@arc42/mermaid` package and stable parser model/API.
- [x] Add architecture, sequence, flowchart, malformed-input, and header tests.
- [x] Add asynchronous core validation paths without breaking the synchronous
  public validation API.
- [x] Route filesystem/CLI validation through the asynchronous parser-aware
  path.
- [x] Build the CLI and validate repository docs/examples with `arc42`.
- [x] Run formatting, type checking, tests, and diff hygiene checks.

### Completed
- [x] Added `packages/mermaid/src/model.ts` with notation, request, result,
  failure, success, and parser interfaces.
- [x] Added `packages/mermaid/src/parser.ts` backed by Mermaid's real parser,
  normalized errors, header guards, and lazy loading.
- [x] Added `validateDocumentsAsync`/`processArchitectureAsync` and parser
  diagnostics mapped to E010/E012/E013/E014 by diagram type.
- [x] Updated `@arc42/workspace-fs` so CLI validation uses the async path.
- [x] `pnpm run build` succeeded and `pnpm run validate:all` reported zero
  errors and warnings for first-party docs; the example retains five existing
  H007 hints.
- [x] `pnpm test`: 52 files and 264 tests passed.
- [x] `pnpm run check` and `git diff --check` passed.
- [x] Reviewer follow-up removed duplicate syntax diagnostics and added an
  async core integration test.
- [x] Reviewer follow-up enabled flowchart syntax mapping for E013/E014,
  hardened lazy-import recovery, and kept Mermaid out of the CLI bundle.
- [x] CLI validation after the follow-up again reports 0 errors and 0 warnings
  for first-party docs; the example retains five existing H007 hints.
- [x] Fixed web rendering of deployment architecture diagrams by skipping
  unsupported click directives for `architecture-beta` sources.
- [x] Confirmed the reported E012 is a genuine empty `mermaid-sequence` source
  in the external workspace, while the deployment failure was a renderer-only
  source mutation issue rather than a CLI validation failure.
- [x] Rebuilt the CLI after the web change so `arc42 serve` copies the updated
  renderer assets, and added an end-to-end regression test for deployment
  architecture rendering.
- [x] Cleaned up Mermaid-generated error SVGs after render rejection so the
  React error placeholder is not duplicated by Mermaid's own error graphic.
- [x] Extended syntax coverage to `mermaid-class` and generic `mermaid`
  diagrams, including empty-source diagnostics.
- [x] Reviewer follow-up added cold-start test timeouts, anonymous-fence
  coverage, context error-code mapping, safer Node sanitizer fallbacks, and
  comment-tolerant architecture click detection.
- [x] Latest verification passed: 53 test files, 268 tests, 20 Playwright
  tests, formatting, type checks, and diff checks.

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
