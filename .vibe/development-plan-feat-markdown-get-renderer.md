# Development Plan: arc42-language (feat/markdown-get-renderer branch)

*Generated on 2026-09-04 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Add a `--format markdown` option to `arc42 get` that renders workspace and single-element views as human-readable Markdown with navigable links. Links use `file#heading-anchor` format (GitHub-style slugs) so refs are navigable in any web-UI that renders Markdown. No new npm dependencies.

## Key Decisions

- `markdown` is additive — `text` stays the default. No breaking change.
- No `glow` dependency. Documented as an optional pipe tip in CLI help.
- No TTY detection / auto-switching. Users opt in with `--format markdown`.
- Zero new runtime npm deps. Pure string manipulation.
- Add `heading?: string` to `SourceLocation` (Option B) — the builder already iterates nodes linearly and can track `currentHeading`; this is the cleanest place to capture it.
- Heading anchor slugs use GitHub-style convention: lowercase, spaces→hyphens, strip non-alphanumeric except hyphens. This is the most widely supported format.
- Refs in element view become `[{id}]({file}#{slug})` when `loc.heading` is present, `[{id}]({file})` otherwise (graceful fallback).
- In workspace view, each element's H3 header acts as its own anchor; cross-refs within the same document could link to `#{slug}` but we keep it simple: file+heading links for outgoing refs via the `edges[]` cross-reference pass.
- `markdown` renderer lives in `packages/core/src/renderer/markdown.ts`.
- Registered in `packages/core/src/renderer/index.ts` alongside `text` and `json`.
- Tests: builder test for `loc.heading`, dedicated `MarkdownGetRenderer` describe block in `renderer.test.ts`.
- CLI `printHelp()` updated to show `markdown` as valid format and add glow tip.

## Notes

### Codebase structure

- Monorepo with pnpm workspaces: `packages/core`, `packages/cli`, `packages/skill`
- `packages/core/src/renderer/` contains `types.ts`, `text.ts`, `json.ts`, `index.ts`
- `GetRenderer` interface: `meta: RendererMeta` + `render(result: GetResult): string`
- `GetResult` = `WorkspaceView | ElementView`
- `WorkspaceView`: elements sorted by arc42 chapter order, plus `edges[]`, optional `typeFilter`
- `ElementView`: single element + `refsFrom[]` + `refsTo[]` (each ref has `.id` and optional `.element` with full element including `loc`)
- All 13 element kinds defined in `model/types.ts`
- `buildWorkspace` in `builder.ts` iterates `doc.nodes` linearly — heading tracking is a trivial addition (same pattern used in W005 validator rule)
- CLI wires `--format` via `rendererById.get(format)` — only `printHelp()` needs updating, no format dispatch changes
- Test runner: `vite-plus/test` (vitest-compatible), tests in `packages/core/tests/renderer.test.ts` and `builder.test.ts`

### Heading anchor slug algorithm

```
function toSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")   // strip non-alphanumeric (keep hyphens)
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/-+/g, "-")         // collapse multiple hyphens
    .replace(/^-|-$/g, "");      // trim leading/trailing hyphens
}
```

### Markdown output design

**Workspace view:**
```markdown
# arc42 Architecture — Building Blocks

## Chapter 5 — Building Blocks (2)

### bb-api — API

- technology: REST
- implements: [bb-core](building-blocks.arc42.md#core), [bb-db](building-blocks.arc42.md#database)
- location: [building-blocks.arc42.md:12](building-blocks.arc42.md#rest-api)

### bb-core — Core

- location: [building-blocks.arc42.md:24](building-blocks.arc42.md#core)
```

**Single element view:**
```markdown
# [decision] dec-rest-api

**Use REST over HTTP/JSON for all external-facing APIs**

- status: accepted
- date: 2026-01-10
- addresses: qg-maintainability, qg-observability

## References

**→ outgoing**
- [qg-maintainability](quality-goals.arc42.md#maintainability) — quality-goal
- [qg-observability](quality-goals.arc42.md#observability) — quality-goal

*location: [decisions.arc42.md:16](decisions.arc42.md#rest-over-httpjson)*
```

## Explore
### Tasks
- [x] Read renderer types, text.ts, json.ts, index.ts
- [x] Read model/types.ts (all element kinds and their fields)
- [x] Read CLI cli.ts (how --format is wired)
- [x] Read renderer.test.ts (test patterns to follow)
- [x] Read example arc42 files (bookstore-backend) for realistic output feel
- [x] Read builder.ts (how loc is constructed, where to inject heading)
- [x] Read ast.ts (HeadingNode structure)
- [x] Read w005 rule (confirms heading-tracking pattern)
- [x] Confirm zero-dep constraint
- [x] Decide on markdown output design and link strategy

### Completed
- [x] Created development plan file

## Plan
### Tasks
- [x] Confirm markdown output design (workspace + single element)
- [x] Decide on heading link strategy (Option B: add `heading` to SourceLocation)
- [x] Define slug algorithm (GitHub-style)
- [x] Identify all touch points (5 files + new renderer file)
- [x] Confirm test scope (builder.test.ts + renderer.test.ts)

### Completed
*None yet*

## Code
### TDD sequencing

TDD order: tests first (red), then implementation (green). Two waves — Wave 2 depends on Wave 1 being green.

**Wave 1 — model change (agent: coding)**
Step 1 (RED): Write `builder.test.ts` test for `loc.heading` — run tests, expect failure.
Step 2 (GREEN): Extend `SourceLocation` in `types.ts` + track `currentHeading` in `builder.ts`.
Step 3 (VERIFY): Run tests, all green.

**Wave 2 — renderer (agent: coding, after Wave 1 is green)**
Step 4 (RED): Write all `MarkdownGetRenderer` tests in `renderer.test.ts` — run tests, expect failure.
Step 5 (GREEN): Implement `markdown.ts` + register in `index.ts`.
Step 6 (VERIFY): Run tests, all green.

**Wave 3 — CLI help (no test needed)**
Step 7: Update `printHelp()` in `cli.ts`.

### Implementation tasks

#### Wave 1 — model

1a. **`packages/core/tests/builder.test.ts`** (RED first)
   - Add test: block preceded by a heading → `el.loc.heading` equals that heading text
   - Add test: block with no preceding heading → `el.loc.heading` is `undefined`
   - Add test: heading resets between blocks (second block under new heading gets new heading)

1b. **`packages/core/src/model/types.ts`** — extend `SourceLocation`
   - Add `heading?: string` field

1c. **`packages/core/src/model/builder.ts`** — track heading context
   - Add `let currentHeading: string | undefined` before the nodes loop in `buildWorkspace`
   - Set `currentHeading = node.text` on each `HeadingNode`
   - Include `heading: currentHeading` in all `loc` objects

#### Wave 2 — renderer

2a. **`packages/core/tests/renderer.test.ts`** (RED first) — new `describe("MarkdownGetRenderer")` block:
   - imports from `../src/renderer/markdown.ts`
   - `meta.id` equals `markdown`
   - `meta.mimeType` equals `text/markdown`
   - workspace view: output starts with `# arc42 Architecture`
   - workspace view: chapter headers use `## Chapter N — Title (count)`
   - workspace view: element entries use `### id — title`
   - workspace view: location line is a markdown link `[file:line](file#slug)`
   - workspace view: omits fields with no value
   - single element view: H1 contains `[kind]` and id
   - single element view: title rendered as `**bold**`
   - single element view: has `## References` section
   - single element view: outgoing refs rendered as `[id](file#slug) — kind`
   - single element view: incoming refs rendered as `[id](file#slug) — kind`
   - registry contains `markdown` renderer (in `builtinGetRenderers`)

2b. **`packages/core/src/renderer/markdown.ts`** (new file)
   - `toSlug(text: string): string` helper — GitHub-style: lowercase, spaces→hyphens, strip non-alphanumeric except hyphens
   - `locLink(loc: SourceLocation): string` — `[file:line](file#slug)` if `loc.heading`, else `[file:line](file)`
   - `refLink(ref: {id: string; element?: Element}): string` — `[id](file#slug) — kind` if element has loc, else plain `id`
   - `MarkdownGetRenderer` class implementing `GetRenderer`:
     - `meta`: id=`markdown`, description, mimeType=`text/markdown`
     - `renderWorkspace(view)`: H1, chapter groups (H2), per-element blocks (H3 + field bullets)
     - `renderElement(view)`: H1, bold title, field bullets, `## References` with `→`/`←` subsections, italic location
     - Field rendering for all 13 element kinds (same fields as `text.ts`, formatted as bullets)
     - Omit undefined/empty optional fields

2c. **`packages/core/src/renderer/index.ts`** — register renderer
   - Import `MarkdownGetRenderer`, instantiate, add to `builtinGetRenderers` array

#### Wave 3 — CLI

3a. **`packages/cli/src/cli.ts`** — update `printHelp()`
   - Change `json|text` → `json|text|markdown` in the `get` usage line
   - Add tip line: `  Tip: arc42 get --format markdown | glow -`

### Completed
- [x] Wave 1: `loc.heading` in `SourceLocation` + builder tracking — 3 new tests, all green
- [x] Wave 2: `MarkdownGetRenderer` implemented + registered — 13 new tests, all green
- [x] Wave 3: `printHelp()` updated with `markdown` format and glow tip
- [x] Full suite: 206 tests passing, 0 failures

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
