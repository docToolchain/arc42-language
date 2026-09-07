# Development Plan: arc42-language (feat/visualize-ignores branch)

*Generated on 2026-09-07 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Render parsed `:::ignore` directives only inside expanded element cards in the web UI. Each directive is a compact warning line containing its rule code and either its author-provided reason or the associated rule's human-readable name; prose and agent views must not expose the directive as visible prose.
## Key Decisions
- Ignore directives remain AST nodes so they can be associated with the following card without changing source parsing.
- `DocumentView` will group directives between prose and an arc42 block into the same prose-run, while excluding them from the prose text passed to Markdown.
- The expanded `ElementCard` will render the directives; collapsed human prose hides them, while agent view preserves attached directives as reconstructed arc42 source.
- Rule fallback text will come from registered rule metadata, with a safe rule-code fallback for unknown rules.
- The directive is attached to the following `inArc42Fence` block before prose grouping; this preserves the existing prose/card toggle and source order.
- Human prose view hides attached directives, expanded cards show them as `⚠ RULE - reason/name`, and agent view reconstructs the raw directive in the arc42 source.
- The web payload remains unchanged: the browser uses `DocumentAst.nodes`, not `Workspace.ignoreDirectives`, so no `used`/stale status is implied.
- Rule metadata already exposes `meta.docs.description`; the renderer will use that as the human-readable fallback and the rule code if metadata is unavailable.
- Each ignore is single-use and source-scoped: it suppresses only the nearest subsequent diagnostic with the same rule code in the same file. A directive therefore cannot hide all occurrences of H014 in a document; additional suppressed building blocks require additional directives.

## Notes
*Additional context and observations*

## Explore
### Tasks
- [x] Trace the parser, browser AST mirror, document grouping, card rendering, and rule metadata.
- [x] Identify the existing untracked web test expectations for source reconstruction and grouping.
- [x] Add browser AST and grouping support for ignore nodes.
- [x] Render compact card-only warning lines with rule-name fallback text.
- [x] Add styling and focused tests.

### Completed
- [x] Created development plan file
- [x] Completed repository exploration

## Plan
### Tasks
- [x] Define the ignore grouping contract: collect contiguous ignore nodes before the next arc42 block, pass them on the virtual prose-run, and leave orphaned directives non-visible in human prose.
- [x] Define fallback lookup: expose a small rule-code-to-description map from core metadata in the payload only if needed; otherwise keep the web package's known-rule map synchronized and use the code for unknown rules.
- [x] Define focused assertions: reconstruction with/without reasons, grouping with ignores between prose and blocks, attached ignores absent from prose/collapsed views, and visible in expanded human cards.
- [x] Select the smallest architecture: extend the browser AST mirror and virtual grouping node, without changing parser or workspace payload semantics.

### Completed
- [x] Chose to preserve ignore nodes in the document AST and pass them separately from prose text.

## Code
### Tasks
- [x] Add `IgnoreNode` to the browser AST types and `ignores` to `ProseRunNode`.
- [x] Update `groupNodes` to associate ignores with the following arc42 block while excluding them from Markdown text.
- [x] Render reconstructed ignore directives in agent mode and compact warning rows in expanded human cards.
- [x] Add rule-name fallback resolution and CSS for compact responsive warning rows.
- [x] Add/adjust focused tests and run web type-check, focused tests, and build.

### Completed
- [x] Implemented browser AST typing, following-block grouping, agent reconstruction, human card warnings, and fallback labels.
- [x] `pnpm --filter @arc42/web exec tsc --noEmit` passes.
- [x] Focused `AstNodeRenderer.test.ts` passes (3 tests); web production build passes.
- [x] Full `vp test run` is not a valid verification command for this package because it imports Playwright e2e suites into Vitest; the two e2e suites fail before running with Playwright's "test() called here" guard.
- [x] Fixed rule suppression scope so one directive consumes only one matching subsequent diagnostic; added a regression test covering multiple H014/E005-style findings.
*None yet*

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
