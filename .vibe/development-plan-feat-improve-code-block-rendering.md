# Development Plan: arc42-language (feat/improve-code-block-rendering branch)

_Generated on 2026-09-03 by Vibe Feature MCP_
_Workflow: [minor](https://codemcp.github.io/workflows/workflows/minor)_

## Goal

Improve the rendering of `:::block` fences in `.arc42.md` files. Currently, `:::type` lines are
not recognised by standard Markdown renderers (GitHub, VS Code preview, editors) and render as
raw text — often collapsed to a single line, with no visual separation or structure.

The fix wraps each `:::block` in a ` ```arc42 ` / ` ``` ` cosmetic fence so renderers display
it as a styled, bordered code block. The `:::` syntax inside is unchanged; the parser must learn
to skip the backtick wrapper lines transparently.

## Key Decisions

- **Wrap with ` ```arc42 ` / ` ``` `** — `arc42` is a meaningful language hint; no syntax
  highlighter knows it yet, but it is the correct label and opens the door to a TextMate grammar
  later. The ` ``` ` lines are purely cosmetic and must be invisible to the parser.

- **`:::diagram` blocks must NOT be wrapped** — The parser handles `:::diagram` differently:
  after the closing `:::`, it watches for the very next fenced code block (` ```mermaid ` etc.)
  as the diagram source. A ` ```arc42 ` wrapper around a `:::diagram` block would produce a
  bare ` ``` ` closing line that the diagram-source state machine would misread as ending the
  Mermaid fence. Diagram blocks keep their current bare syntax.

- **Parser change is transparent** — The opening ` ```arc42 ` line and its matching ` ``` `
  closing line are consumed and discarded. Everything between them is processed exactly as
  if the wrapper did not exist. No AST node is emitted for the fence.

- **Only ` ```arc42 ` triggers this behaviour** — other fenced code blocks (` ```mermaid `,
  ` ```bash `, etc.) are not affected. The parser only skips the wrapper when the opening
  fence is exactly ` ```arc42 ` and we are not already inside a diagram-source state.

- **Original design intent is preserved** — The original design chose `:::` (MyST/Pandoc
  fenced div syntax) for LSP-friendliness and parser simplicity. That choice stands. The
  backtick wrapper is a rendering convenience layered on top, not a syntax change.

- **New structural warning W016: block not wrapped in ` ```arc42 ` fence** — The ` ```arc42 `
  wrapper is the canonical authoring convention. A `:::block` that is not preceded by a
  ` ```arc42 ` opening fence (i.e. the block was parsed outside of the arc42 fence state)
  produces a W016 warning. Severity is warning (not error) because this is a convention
  change and existing workspaces need time to migrate.

- **`:::diagram` is explicitly exempt from W016** — `:::diagram` blocks already have a
  visual pair (the ` ```mermaid ` / ` ``` ` fence for the diagram source). Requiring them
  to also be wrapped in ` ```arc42 ` would add noise and confuse authors. The W016 rule
  skips blocks of type `diagram`.

## Notes

- The `:::diagram` + ` ```mermaid ` pattern in `06-runtime-view.arc42.md` is the key
  constraint. The diagram-source state machine in the parser (lines 115–135) must not see
  a bare ` ``` ` line from an arc42 wrapper fence while in `pendingDiagram` or `openDiagram`
  state. The guard `!openDiagram && !pendingDiagram` on the arc42-fence detection handles this.
- `docs/arc42/`, `examples/bookstore-backend/`, and `templates/starter/` all need updating.
  `packages/skill/SKILL.md` and `README.md` examples should also show the wrapped syntax so
  authors and agents learn the new convention.
- W016 requires the parser to track whether each `BlockNode` was parsed inside an arc42
  fence. The arc42 fence — like HTML comments — does not emit an AST node; it is invisible
  infrastructure that affects parser state only. The parser sets a boolean flag `inArc42Fence`
  on each emitted `BlockNode`. W016 reads `node.inArc42Fence` directly — no stateful AST walk
  needed. This is consistent with `startLine`/`endLine` as other parser-context fields on
  `BlockNode`.

## Explore

### Tasks

- [x] Understand the problem: `:::blocks` render as raw text in standard Markdown viewers
- [x] Review parser source to understand state machine and constraints
- [x] Identify `:::diagram` conflict and design the guard condition
- [x] Identify all files that need updating (docs, examples, templates, skill, README)

### Completed

- [x] Created development plan file
- [x] Analysed parser state machine in `packages/core/src/parser/markdown-parser.ts`
- [x] Confirmed `:::diagram` incompatibility with ` ```arc42 ` wrapper
- [x] Documented all key decisions

## Implement

### Tasks

- [x] Extend parser to skip ` ```arc42 ` / ` ``` ` wrapper fences (guard: not in diagram state)
- [x] Add W016 validator rule: `:::block` not wrapped in ` ```arc42 ` fence (exempt: `diagram`)
- [x] Add `inArc42Fence: boolean` to `BlockNode` AST type
- [x] Add parser tests for backtick-wrapped `:::blocks`
- [x] Add W016 unit tests
- [x] Wrap `:::blocks` in `docs/arc42/*.arc42.md` (skipped `:::diagram` blocks)
- [x] Wrap `:::blocks` in `examples/bookstore-backend/`
- [x] Update `packages/skill/SKILL.md` examples and authoring convention to show wrapped syntax
- [x] Update `README.md` examples to show wrapped syntax
- [x] Wrap `:::blocks` in `templates/starter/` example blocks (inside HTML comments — all wrapped)

### Completed

- [x] All 176 tests pass
- [x] `docs/arc42` validates with 0 errors, 0 warnings, 0 hints
- [x] `examples/bookstore-backend` has 0 W016 diagnostics (only pre-existing W006/H-rules)

## Finalize

### Tasks

- [x] Run `pnpm test` — all 176 tests pass
- [x] Run `pnpm run validate:source` — 0 errors, 0 W016 warnings in docs/arc42

### Completed

- [x] All verification complete

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
