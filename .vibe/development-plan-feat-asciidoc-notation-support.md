# Development Plan: arc42-language (feat/asciidoc-notation-support branch)

*Generated on 2026-09-24 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Add AsciiDoc (`.arc42.adoc`) as a supported notation format alongside Markdown (`.arc42.md`).

Notation is detected automatically from file extensions during workspace discovery — no config needed. A workspace using only `.arc42.adoc` files uses AsciiDoc; one using only `.arc42.md` uses Markdown. Mixed workspaces fail with a clear error. All notation-specific behavior is encapsulated behind a `NotationAdapter` interface. Prose rendering uses a symmetric `ProseRenderer` interface that populates `ProseNode.renderedHtml` as a post-parse step, keeping `ProseNode.text` as raw source throughout.

## Key Decisions

- **Extension-based detection**: notation inferred from file extensions found during `discoverFiles()`. Zero-config.
- **Error on mixed notation**: both `.arc42.md` and `.arc42.adoc` present → clear CLI error, no workspace loaded.
- **`NotationAdapter` in `@arc42/core`**: interface only — `NotationAdapter`, `ProseRenderer`, `Notation`. Concrete implementations live in `@arc42/workspace-fs` to keep both `marked` and `asciidoctor` out of the browser bundle.
- **`MarkdownNotationAdapter` and `AsciidocNotationAdapter` in `@arc42/workspace-fs`**: selected once at discovery time via `createAdapterForNotation(notation)` factory.
- **`ProseRenderer` interface**: a dedicated renderer that runs as a post-parse step and populates `ProseNode.renderedHtml`. Symmetric for both notations — `MarkdownProseRenderer` uses `marked.parse()`, `AsciidocProseRenderer` uses `asciidoctor.load().convert()`. Both implementations live in `workspace-fs`.
- **`ProseNode.renderedHtml?: string`**: added to `ProseNode` in `core/src/ast.ts`. `text` always stays raw source. Non-rendering consumers (`diff.ts`, `builder.ts`, `w004`) use `text` — unaffected.
- **`renderProseNodes()` post-parse step is async**: returns `Promise<DocumentAst>` to support async asciidoctor.load().convert() chain. Called in `readWorkspaceDocuments()` via `parseArchitectureDocumentAsync()`.
- **`parseArchitectureDocument()` stays synchronous**: existing callers (git-diff, CLI renderer tests) are unaffected. New `parseArchitectureDocumentAsync()` added for notation-aware async pipeline.
- **Web SPA uses `marked` as fallback**: `ProseBlock` uses `html` prop (pre-rendered) when present, falls back to `marked.parse(text)` for legacy payloads. `marked` stays in `web/package.json` as a fallback. Web SPA never needs `asciidoctor`.
- **`notation` on `WorkspacePayload`**: add `notation?: "markdown" | "asciidoc"` to `core/src/workspace.ts`.
- **DSL wrapping convention for AsciiDoc**: `[source,arc42]` + `----` delimiters (equivalent of `` ```arc42 `` + `` ``` ``).
- **W016 message**: add `fenceDescription?: string` to `ValidationContext`. W016 reads `context?.fenceDescription ?? "\`\`\`arc42 fence"` for its human-readable message. `NotationAdapter.fenceDescription` is passed into `ValidationContext` when calling `validateWorkspace`.
- **`discover.ts` is already notation-agnostic**: `.arc42.` pattern — no change needed.
- **`@arc42/core/types` subpath export**: dedicated browser-safe type-only subpath with `"types"` condition. Resolves via TypeScript `bundler` moduleResolution. `web/src/types.ts` replaced with re-exports from `@arc42/core/types` + web-only `ProseRunNode`/`AstNode` virtual types.
- **`@arc42/core/parser` subpath export**: exports `Parser`, `MarkdownParser`, `AsciidocParser`. Used by workspace-fs adapters.
- **`renderProseNodes()` groups consecutive prose nodes**: changed from per-line rendering to grouping consecutive prose nodes and rendering them as one block. The full HTML goes on the first node; subsequent nodes get `""` so `DocumentView`'s `proseRendered.length === proseLines.length` guard still passes. This fixes AsciiDoc tables, multi-line paragraphs, and cross-reference links which all need context to render correctly.
- **`AsciidocProseRenderer` switched to static `import { load } from "asciidoctor"`**: replaced `createRequire('@asciidoctor/core/build/node/index.cjs')` which failed in dev (pnpm's flat store layout means the CJS path is not directly in workspace-fs/node_modules). Static import resolves correctly via pnpm's symlink structure. A local `src/asciidoctor-types.d.ts` stub adds the `declare module "asciidoctor"` declaration needed because the package's exports map lacks a `"types"` condition (moduleResolution: nodenext ignores the top-level `"types"` field when an exports map is present).
- **`arc42 guide --notation asciidoc`**: added `notation` parameter to `guideText()` and `--notation` flag to `runGuide()` in `cli.ts`. When `asciidoc`, the migration guide, chapter guides, and starter templates all show `.arc42.adoc` extensions, `[source,arc42]` + `----` fences, and AsciiDoc heading syntax. The `templateToAsciidoc()` helper transforms Markdown templates inline (h1, code fences, HTML comment blocks). `guide.ts` now imports `chapter()` and `CHAPTERS` from `chapters.ts` instead of using `readFileSync` — eliminates the `dist/templates/` file system dependency entirely, fixing the previously-failing `help.test.ts`. All 47 CLI tests pass.
- **`examples/kanban-board/`**: rebuilt as a correct AsciiDoc workspace. Files use `= Heading` syntax; quality-goals moved from ch1 to `10-quality-requirements.arc42.adoc`; interfaces defined under their provider building-blocks in ch5; missing concepts (accessibility, rate-limiting, event-sourcing, data-persistence) added; self-reference removed from bb-notification-service; runtime scenarios use building-block IDs only. Result: 0 errors, warnings/hints only.
- **Tests**: existing tests keep `.arc42.md` filenames (test data, not logic). New `asciidoc-parser.test.ts` (27 tests) and `asciidoc-integration.test.ts` (3 tests) added in core.
- **Bundle size — `asciidoctor` stays out of the browser**: `AsciidocProseRenderer` and `AsciidocNotationAdapter` live in `workspace-fs` (Node.js only), never imported by web entry points.

## Notes

### `NotationAdapter` interface

```typescript
// packages/core/src/notation/types.ts
export type Notation = "markdown" | "asciidoc";

export interface NotationAdapter {
  readonly notation: Notation;
  readonly fileExtension: string;           // ".arc42.md" | ".arc42.adoc"
  readonly fenceDescription: string;        // for W016 diagnostic messages
  matchesFile(filename: string): boolean;
  createParser(): Parser;
  createProseRenderer(): ProseRenderer;
  chapterFilename(number: number, slug: string): string;
}
```

### `ProseRenderer` interface

```typescript
// packages/core/src/notation/prose-renderer.ts
export interface ProseRenderer {
  renderProse(text: string): string | Promise<string>;  // async for asciidoctor
}

export async function renderProseNodes(doc: DocumentAst, renderer: ProseRenderer): Promise<DocumentAst> {
  // maps over nodes, awaits renderedHtml for each prose node
}
```

### Call chain

```
discoverFilesWithNotation(dir)
  → scans for .arc42.md and .arc42.adoc
  → errors if mixed
  → returns { files: string[], notation: Notation }

readWorkspaceDocuments(dir)
  → calls discoverFilesWithNotation
  → creates adapter via createAdapterForNotation(notation)
  → for each file: parser.parse() → renderProseNodes(doc, proseRenderer)
  → returns DocumentAst[]

loadWorkspace(dir)
  → same pipeline, sets WorkspacePayload.notation

validateWorkspace(dir)
  → same pipeline, passes adapter.fenceDescription into ValidationContext

cli.ts watcher
  → checks both .arc42.md and .arc42.adoc extensions

Web SPA (AstNodeRenderer.tsx)
  → ProseBlock uses node.renderedHtml (html prop) ?? node.text (marked fallback)
```

### asciidoctor API (async via pnpm `asciidoctor` package)

```typescript
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const mod = require("@asciidoctor/core/build/node/index.cjs");
const doc = await mod.load(text, { doctype: "article", safe: "safe", header_footer: false });
const html = await doc.convert();
```

### Full inventory of production code changes (as implemented)

**`@arc42/core` — browser-safe, no `node:` imports:**

| Location | Change |
|---|---|
| `core/src/ast.ts` | Added `renderedHtml?: string` to `ProseNode` |
| `core/src/workspace.ts` | Added `notation?: Notation` to `WorkspacePayload` |
| `core/src/path-utils.ts` | `chapterNumberFromFile` — accepts both `.arc42.md` and `.arc42.adoc` |
| `core/src/arc42.ts` | Added `parseArchitectureDocumentAsync(filePath, content, parser, proseRenderer?)` |
| `core/src/validator/types.ts` | Added `fenceDescription?: string` to `ValidationContext` |
| `core/src/validator/rules/w016-block-not-in-arc42-fence.ts` | Uses `context?.fenceDescription ?? "\`\`\`arc42 fence"` |
| `core/src/notation/types.ts` | **new** — `Notation`, `NotationAdapter` interface |
| `core/src/notation/prose-renderer.ts` | **new** — `ProseRenderer` interface + async `renderProseNodes()` |
| `core/src/notation/index.ts` | **new** — barrel export for notation interfaces |
| `core/src/parser/asciidoc-parser.ts` | **new** — `AsciidocParser` + `parseAsciidoc()` |
| `core/src/parser/index.ts` | **new** — `Parser`, `MarkdownParser`, `AsciidocParser` subpath export |
| `core/src/types-export.ts` | **new** — browser-safe type-only subpath export |
| `core/src/index.ts` | Added `parseArchitectureDocumentAsync`, notation interfaces to barrel |
| `core/package.json` | Added `./types` and `./parser` subpath exports (with `"types"` condition) |

**`@arc42/workspace-fs` — Node.js only, safe for heavy deps:**

| Location | Change |
|---|---|
| `workspace-fs/package.json` | Added `asciidoctor` and `marked` dependencies |
| `workspace-fs/src/notation/asciidoc-prose-renderer.ts` | **new** — `AsciidocProseRenderer` |
| `workspace-fs/src/notation/asciidoc-adapter.ts` | **new** — `AsciidocNotationAdapter` |
| `workspace-fs/src/notation/markdown-prose-renderer.ts` | **new** — `MarkdownProseRenderer` |
| `workspace-fs/src/notation/index.ts` | **new** — `MarkdownNotationAdapter`, `createAdapterForNotation()` |
| `workspace-fs/src/index.ts` | notation-aware discovery, `loadWorkspace`/`validateWorkspace` wired |
| `workspace-fs/src/git-diff.ts` | Lines 178, 197 — match both extensions |

**`@arc42/cli`:**

| Location | Change |
|---|---|
| `cli/src/cli.ts` | Line 623 watcher — checks both `.arc42.md` and `.arc42.adoc` |
| `cli/src/help.ts` | Mentions both extensions |
| `cli/src/guide.ts` | Mentions both extensions |

**`@arc42/web` — browser bundle:**

| Location | Change |
|---|---|
| `web/src/types.ts` | Now re-exports from `@arc42/core/types`; adds web-only `ProseRunNode`/`AstNode` |
| `web/src/utils.ts` | `basename()` — strips `.arc42.adoc` too |
| `web/src/AstNodeRenderer.tsx` | `ProseBlock` uses `html` prop (server-rendered) with `marked` fallback |
| `web/src/DocumentView.tsx` | `groupNodes()` carries `renderedHtml` through prose run grouping |

## Explore
### Tasks
- [x] All exploration tasks complete

### Completed
- [x] Full codebase exploration

## Plan
### Tasks
- [x] Design `NotationAdapter` interface
- [x] Design `ProseRenderer` interface and post-parse step
- [x] Resolve `ProseNode.text` vs `renderedHtml` semantic conflict
- [x] Confirm web types are hand-maintained mirror (must update both)
- [x] Document all production code locations requiring change
- [x] Decide on `ValidationContext.fenceDescription` for W016
- [x] Confirm `discover.ts` is already notation-agnostic
- [x] Confirm test strategy

### Completed
- [x] Plan phase complete 2026-09-24

## Code
### Tasks

**Step 1 — Core: AST types and shared interfaces** ✅
- [x] Add `renderedHtml?: string` to `ProseNode` in `packages/core/src/ast.ts`
- [x] Add `notation?: Notation` to `WorkspacePayload` in `packages/core/src/workspace.ts`
- [x] Add `fenceDescription?: string` to `ValidationContext` in `packages/core/src/validator/types.ts`
- [x] Update `chapterNumberFromFile()` in `packages/core/src/path-utils.ts` to accept both extensions

**Step 2 — Core: `ProseRenderer` interface** ✅
- [x] Create `packages/core/src/notation/prose-renderer.ts` with `ProseRenderer` interface and async `renderProseNodes()`

**Step 3 — Core: `NotationAdapter` interface and notation barrel** ✅
- [x] Create `packages/core/src/notation/types.ts` with `Notation` type and `NotationAdapter` interface
- [x] Create `packages/core/src/notation/index.ts` exporting interfaces only

**Step 4 — Core: `AsciidocParser`** ✅
- [x] Create `packages/core/src/parser/asciidoc-parser.ts` implementing structural tokenization
- [x] Create `packages/core/src/parser/index.ts` exporting `Parser`, `MarkdownParser`, `AsciidocParser`
- [x] Add 27 unit tests in `packages/core/tests/asciidoc-parser.test.ts`

**Step 5 — Core: update `arc42.ts`, W016, barrel export** ✅
- [x] Add `parseArchitectureDocumentAsync()` to `arc42.ts`
- [x] Update W016 to use `context?.fenceDescription` in message
- [x] Export notation types and `parseArchitectureDocumentAsync` from `packages/core/src/index.ts`

**Step 6 — `workspace-fs`: AsciiDoc implementations and factory** ✅
- [x] Add `asciidoctor` and `marked` to `packages/workspace-fs`
- [x] Create `AsciidocProseRenderer`, `AsciidocNotationAdapter`, `MarkdownProseRenderer`, `MarkdownNotationAdapter`
- [x] Create `createAdapterForNotation(notation)` factory

**Step 7 — `workspace-fs`: notation-aware discovery and wiring** ✅
- [x] `discoverFilesWithNotation()` — mixed workspace error
- [x] `readWorkspaceDocuments()`, `loadWorkspace()`, `validateWorkspace()` — wired with adapter
- [x] `git-diff.ts` — match both extensions

**Step 8 — CLI** ✅
- [x] `cli.ts` watcher — checks both extensions
- [x] `help.ts` and `guide.ts` — mention both extensions

**Step 9 — Core: `@arc42/core/types` and `@arc42/core/parser` subpath exports** ✅
- [x] Create `packages/core/src/types-export.ts`
- [x] Add `./types` (with `"types"` condition) and `./parser` subpath exports to `core/package.json`

**Step 10 — Web SPA: updated types and prose rendering** ✅
- [x] Replace `web/src/types.ts` with re-exports from `@arc42/core/types` + web-only virtual types
- [x] Update `utils.ts` `basename()` to strip `.arc42.adoc`
- [x] Update `AstNodeRenderer.tsx` `ProseBlock` to use pre-rendered `html` prop with `marked` fallback
- [x] Thread `renderedHtml` through `DocumentView.tsx` `groupNodes()`

**Step 11 — arc42 architecture docs** ✅
- [x] Run `pnpm arc42 --dir docs/arc42 validate` — 0 errors, 0 warnings, 1 pre-existing hint

**Integration tests** ✅
- [x] `packages/core/tests/asciidoc-integration.test.ts` — 3 integration tests

### Completed
- [x] All 11 code steps implemented and verified. All tests pass. All packages check clean.
- [x] Full `pnpm vp run -r build` passes. Root cause of build failure diagnosed and fixed (web lib ES2020→ES2021). Stash-induced merge conflicts resolved. Corrupted char in docs/arc42 restored.
- [x] `arc42 guide --notation asciidoc` added. Guide output adapts extensions, fence syntax, and headings. `guide.ts` now uses inline templates from `chapters.ts` (no readFileSync). All 47 CLI tests pass.
- [x] `examples/kanban-board/` rebuilt and validated: 0 errors, 0 warnings, 0 hints (H014 suppressed via :::ignore block at top of ch5 with demo note admonition in ch1).
- [x] Parser classes added to core main barrel — fixes CLI bundle (subpath imports not inlined by vp pack).
- [x] `arc42` binary linked to local dev build via vite-plus symlink repoint.
- [x] `renderProseNodes()` now groups consecutive prose nodes — fixes AsciiDoc table/link rendering.
- [x] `AsciidocProseRenderer` uses static `import { load } from "asciidoctor"` — fixes pnpm module resolution. Local `asciidoctor-types.d.ts` stub resolves TS7016.
- [x] AsciiDoc admonition block styling added to `DocumentView.module.css` using `:global()` selectors — required because asciidoctor emits raw (non-scoped) class names into `dangerouslySetInnerHTML`.

## Commit
### Tasks
- [ ] Write commit message and commit all changes

### Completed
*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
