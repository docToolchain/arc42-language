# Development Plan: arc42-language (feat/visualize-hints branch)

*Generated on 2026-09-07 by Vibe Feature MCP*
*Workflow: [minor](https://codemcp.github.io/workflows/workflows/minor)*

## Goal
Make `:::ignore RULE [reason] :::` directives visible in the web renderer instead of silently
dropping them. The visualization should preserve document order and make the suppressed rule and
author-provided reason understandable to human readers, while retaining the raw directive in the
agent view.
## Key Decisions
- The first increment is limited to the existing `packages/web` document renderer; it does not add
  a new CLI command, persistence layer, validation rule, or ignore-management workflow.
- `IgnoreNode` in `DocumentAst.nodes` is the source of truth. The renderer will not reconstruct
  directives from `Workspace.ignoreDirectives`, which is validator metadata and currently is not
  part of the web payload returned by `loadWorkspace()`.
- Ignore nodes remain in their original position in both views. They must not be grouped into prose
  runs or attached to an adjacent architecture block.
- Ignore directives are attached to the following architecture block. Human prose view hides them;
  expanded card view shows a compact warning line (`⚠ ID - reason`, or a rule name when no reason is
  available). Agent view keeps attached directives in the reconstructed arc42 source.
- The visualization will not claim whether an ignore is currently used or stale. `used` is mutable
  validation-run metadata, while the current serve payload exposes parsed documents only. Active or
  stale status is deferred until the web API supplies validated diagnostics/directive metadata.
- Malformed or bare ignore nodes, if present in the AST, remain visible as inert directives rather
  than being silently discarded; their lack of suppression effect is not changed by rendering.

## Notes
- No `.vibe/docs/requirements.md` or `.vibe/docs/design.md` exists; the existing ignore feature
  plan and web-renderer plan are the applicable sources of truth.
- The ignore feature already adds `IgnoreNode` to the core AST, but the browser-side AST mirror does
  not define it. `DocumentView.groupNodes()` currently routes it to an ordinary group and
  `AstNodeRenderer` has no ignore case, so it is effectively invisible.
- `IgnoreDirective` contains `used`, file, and line metadata, but `WorkspacePayload` currently
  contains only elements, edges, diagrams, and documents. Rendering from the AST avoids widening
  that payload for the initial increment.
- Existing web behavior uses source order as the document contract and distinguishes human and
  agent views. Ignore rendering should follow those conventions rather than adding a sidebar-only
  summary that loses source context.
- The bookstore sample intentionally suppresses H014 in its context and building-block documents:
  it demonstrates arc42 architecture, not a complete application with implementation repositories.
- Ignore nodes must be grouped with the following block before prose grouping; treating them as
  standalone rendered nodes breaks the existing prose-to-card toggle.
- A standalone ignore renderer is intentionally not used. Orphaned directives are ignored by the
  human view, while attached directives are rendered only when the associated card is expanded.

## Explore
### Tasks
- [x] Read the feature plan for ignore directives and record its syntax, AST shape, and semantics.
- [x] Read the web-renderer plan and identify the document rendering contract and view modes.
- [x] Trace the ignore data flow from parser AST through `Workspace` and `loadWorkspace()` payload.
- [x] Locate the browser AST mirror, node grouping, and renderer dispatch that currently omit ignores.
- [x] Confirm that no requirements or design document overrides the existing feature plans.
- [x] Define the smallest user-visible scope: inline human marker plus raw agent-view directive.
- [x] Define ordering, malformed-node handling, payload boundaries, and stale-status limitations.
- [x] Add implementation tasks for browser types, grouping, rendering, styling, and regression tests.

### Completed
- [x] Created development plan file
- [x] Completed exploration and documented the design decisions above

## Implement
### Tasks
- [x] Add the browser-side `IgnoreNode` type and include it in the web `AstNode` union.
- [x] Ensure document grouping treats ignore nodes as standalone nodes, never as prose/block runs.
- [x] Render human-view ignore markers with rule code, optional reason, source line, and accessible
  labeling; render agent-view directives as reconstructed arc42 source.
- [x] Add focused renderer coverage for source reconstruction, optional reasons, and bare nodes;
  verify existing prose/block grouping remains unchanged through type-check/build checks.
- [x] Add minimal styling consistent with existing web renderer visual language and responsive layout.
- [x] Add document-scoped H014 ignores to the bookstore demo where implementation paths are out of scope.
- [x] Keep attached ignores out of prose view and show compact summaries only in expanded card view.
- [x] Preserve prose/card toggling by attaching ignore nodes to the following block during grouping.

### Completed
- [x] Implemented ignore AST typing and standalone renderer handling
- [x] Added human and agent view output plus responsive marker styling
- [x] Added source reconstruction coverage and verified the web package build
- [x] Verified formatting, linting, type checking, focused tests, and the full test suite
- [x] Revalidated the bookstore sample after adding the intentional path-hint ignores
- [x] Fixed the card-toggle regression and added grouping coverage for attached ignores

## Finalize
### Tasks
- [x] Review the final diff and working tree for unintended changes.
- [x] Report implementation and verification results; leave commit creation to an explicit request.

### Completed
- [x] Confirmed only the intended renderer, test, plan, and bookstore sample files changed.
- [x] Confirmed the bookstore sample has no errors or warnings; five unrelated H007 hints remain.



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
