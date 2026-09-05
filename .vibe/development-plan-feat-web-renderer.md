# Development Plan: arc42-language (feat/web-renderer branch)

*Generated on 2026-09-05 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Add a web-based renderer that beautifully renders arc42 documentation with all its diagrams for human readers. The arc42 code blocks (the structured DSL metadata) are hidden from the human view — they are the "agent's perspective". Humans see prose + rendered Mermaid diagrams + structured element cards. The renderer is accessible via a new `arc42 serve` CLI command and also used to render this project's own docs site.

---

## Key Decisions

1. **No new `apps/` package** — the web renderer lives in `packages/cli` as a `serve` subcommand. The SPA assets (HTML/CSS/JS) are bundled into the CLI dist via vite-plus `copy` rules. This keeps the CLI the single published artefact.

2. **Dual-view toggle** — the UI has an "Agent view" (raw arc42 block text, equivalent to `get --format text`) and "Human view" (prose + rendered diagrams + element cards). Toggle is per-page or global.

3. **Data transport: workspace JSON via HTTP** — the `serve` command starts a tiny HTTP server (Node.js `http` module, no Express) that:
   - Serves the bundled SPA at `/`
   - Exposes `GET /api/workspace` returning the full workspace JSON (elements, edges, diagrams, documents/AST)
   - The SPA fetches on load; no file system access from the browser

4. **Mermaid rendering in browser** — `mermaid` npm package (latest, includes `-beta` support) loaded in the SPA. All diagram `source` strings from the workspace JSON are passed to `mermaid.render()`.

5. **SPA stack** — React 18 + TypeScript + Vite (standard Vite app config, not `vp pack`). Minimal styling via CSS variables (no Tailwind to keep bundle small). No router — single-page with a sidebar nav generated from document headings.

6. **`@arc42/core` is a workspace dep of the CLI** — already bundled via `alwaysBundle: ["@arc42/core"]` in the CLI's vite.config. The serve command reuses the pipeline directly without duplication.

7. **arc42 code block visibility** — The `DocumentAst` (array of `AstNode`) carries all content. `BlockNode` with `inArc42Fence: true` identifies DSL-metadata blocks. In human view these are replaced by element cards. `DiagramNode` source is rendered with Mermaid. `ProseNode` / `HeadingNode` are always visible.

8. **`loadWorkspace` export** — added `loadWorkspace(dir): Promise<WorkspacePayload>` and `WorkspacePayload` type to `@arc42/core` (in `arc42.ts` and `renderer/types.ts`, re-exported from `index.ts`). The serve handler calls it cleanly.

9. **SPA source at `packages/cli/src/web/`; output at `packages/cli/src/web/dist/`** — Vite builds the SPA to `src/web/dist/`. The `vp pack` `copy` array copies `index.html` + `assets/*` into `dist/web/` (next to `dist/cli.mjs`). `vp pack` is configured with `clean: ["dist/cli.mjs"]` so `dist/web/` is never deleted.

10. **Port default: 3142** — arc42. `--open` flag opens browser automatically using `child_process.spawn` with platform detection.

11. **`QualityScenario` was missing from `core/src/index.ts`** — fixed as part of C04.

12. **`parseArgs` in `runServe` uses `strict: false`** — the `commandArgs` slice passed to each subcommand may still contain global flags like `--dir`. `strict: false` prevents an `ERR_PARSE_ARGS_UNKNOWN_OPTION` crash.

13. **`vp pack` `copy` does not recurse into directories with `**` glob + `flatten: false`** — the tsdown copy implementation globs with `expandDirectories: false`, so `**` only matches at the specified level. The workaround is to use two explicit copy rules: one for `index.html` and one for `assets/*`.

14. **Prose grouping in DocumentView** — the parser emits one `ProseNode` per source line. To enable table rendering and collapsible cards, `DocumentView` groups consecutive prose lines into `ProseRunNode` objects (virtual, browser-only). An arc42 `BlockNode` immediately following the last prose line of a paragraph is "attached" to the run. The full joined text is passed to `marked.parse()` as a single string, restoring table rendering.

15. **Collapsible element cards** — `ProseRun` component: prose is shown normally; when an arc42 block is attached, a 4px coloured left stripe (matching the element's chapter colour) is rendered as a `<button>`. Clicking it toggles the `ElementCard` below the prose. Cards are collapsed by default.

16. **`marked` table rendering** — `marked` handles GFM tables by default (no extra configuration needed). The root cause of broken tables was separate `ProseNode.text` strings per line, not a `marked` configuration issue. Fix: merge consecutive prose lines into a single string before passing to `marked.parse()`.

17. **Stripe toggle UX** — clicking the stripe replaces (slides in) the element card in place of the prose text. The prose and card are exclusive: when card is shown, prose is unmounted and vice versa, with a short `translateY` + `opacity` CSS animation.

18. **Hash-based routing** — document navigation uses `window.location.hash` (`#filename.arc42.md`). A `hashchange` event listener syncs state on browser back/forward. Sidebar nav links are `<a href="#filename">` so the URL is bookmarkable and shareable. `onClick` still calls `navigateTo` for immediate state sync without a page reload.

19. **Playwright e2e tests** — 13 tests in `packages/cli/src/web/tests/serve-ui.spec.ts` covering: document navigation (click, direct URL, reload, back), human/agent view toggle, stripe toggle (prose↔card), and the `/api/workspace` endpoint. Two test fixes needed: (a) use `expect(locator).toHaveText()` instead of JS eval for sidebar active label — React renders async; (b) scope `.prose-run__prose-view` assertion to the parent `.prose-run--has-block` container since other runs also have `.prose-run__prose-view` elements.

20. **`packages/web/` extraction** — the SPA is moved from `packages/cli/src/web/` to a top-level `packages/web/` package (`@arc42/web`). The CLI remains the only published artefact; `packages/web/` is a build-time-only dependency (its compiled `dist/` assets are copied into `dist/web/` by the CLI's `vp pack` copy rules). This separation keeps `packages/web/` free of Node.js deps and makes it reusable as a static export target for GitHub Pages.

21. **Dual injection interface (serve vs export)** — the SPA checks `(window as any).__WORKSPACE__` first; if absent it falls back to `fetch('/api/workspace')`. For `arc42 serve` (Mode 1) the CLI never sets `__WORKSPACE__` — the SPA uses the HTTP API. For a future `arc42 export` (Mode 2) the CLI injects `<script>window.__WORKSPACE__ = {...}</script>` into `index.html` at export time — no Vite re-run needed. The `arc42 export` command is out of scope for this branch.

---

## Notes

### Monorepo structure

```
packages/
  core/      @arc42/core — parser, AST, model, renderer types  (private, workspace-only)
  cli/       @doctc/arc42 — published CLI binary
  skill/     arc42 skill SKILL.md
apps/        (listed in pnpm-workspace.yaml but EMPTY — not used for this feature)
tools/       (listed in workspace but EMPTY)
```

### CLI command pattern

All commands are in `packages/cli/src/cli.ts` as `runXxx(dir, args)` functions dispatched from `main()`. Adding `serve`:

```ts
} else if (command === "serve") {
  await runServe(dir, commandArgs);
}
```

### AST structure (key for human/agent toggle)

Each `.arc42.md` file is parsed into a `DocumentAst` with `AstNode[]`:
- `HeadingNode` — markdown heading (level, text, line)
- `ProseNode` — paragraph text
- `BlockNode` — a `:::kind ... :::` block; `inArc42Fence: true` means it was inside ` ```arc42 ``` `
- `DiagramNode` — a diagram fenced block (mermaid-sequence, deployment, generic)

The `Workspace.documents` array carries all `DocumentAst[]`. This is the source of truth for the human view.

### Diagram types

All `DiagramArtifact` subtypes have a `source: string` field containing raw Mermaid source. Pass directly to `mermaid.render()`. The `notation` field tells us which Mermaid mode (e.g. `mermaid-sequence`).

### Build tooling

- `vite-plus` (`vp pack`) bundles the CLI entry as a Node.js ESM bundle.
- The SPA uses standard `vite build` (not `vp pack`) — it's a browser app.
- CLI's `vite.config.ts` uses `pack.copy` to bundle static assets. Same mechanism used to copy the pre-built SPA `dist/web/` folder.
- SPA `vite.config.ts` will live at `packages/cli/src/web/vite.config.ts`.

### API payload type (new in core)

```ts
export interface WorkspacePayload {
  elements: Element[];
  edges: Edge[];
  diagrams: DiagramArtifact[];
  documents: DocumentAst[];
}
```

### Document rendering principle (CRITICAL)

The SPA renders the **full document in original order**. The AST is already the source of truth for document structure — we never reorder, regroup, or synthesise content. We only substitute the display of certain node types.

A real example from `building-blocks.arc42.md`:
```
# Building Blocks                    ← HeadingNode (level 1)
                                     
The bookstore backend follows...     ← ProseNode
                                     
## API Gateway                       ← HeadingNode (level 2)
                                     
The gateway handles TLS...           ← ProseNode
                                     
```arc42                             ← BlockNode (inArc42Fence: true)
:::building-block
id: bb-api-gateway
...
:::
```
                                     
## Catalog Service                   ← HeadingNode (level 2)
...
```

In **human view**: the `:::building-block` block is replaced by an `<ElementCard>` component.
In **agent view**: the entire `\`\`\`arc42 ... \`\`\`` fence is shown verbatim as a code block.

The heading above each block and the prose before it are **always rendered** — they are the human-authored context. The block is a machine-authored annotation that replaces nothing in the prose.

### Human/agent view rendering algorithm (SPA)

For each `DocumentAst` in `documents` array, walk `nodes` in order — **never skip or reorder**:

1. `HeadingNode` → `<h1>`–`<h6>` with an `id` anchor for sidebar linking (always visible in both views)
2. `ProseNode` → `<p>` rendered as markdown-to-HTML via `marked` (always visible in both views)
3. `BlockNode` with `inArc42Fence: true`:
   - **Human view** → `<ElementCard>` — look up element by `attributes.id` from the elements map
   - **Agent view** → `<pre><code class="language-arc42">` with the raw block content
4. `BlockNode` with `inArc42Fence: false` → `<pre><code>` in both views (regular fenced code block)
5. `DiagramNode`:
   - **Human view** → `<MermaidDiagram source={node.source}>` rendering SVG inline
   - **Agent view** → `<pre><code>` showing raw diagram source

### Element card design (human view)

Each `BlockNode (inArc42Fence: true)` is replaced by an `<ElementCard>`. The card shows:
- Kind badge (colour-coded by chapter) + element `id` + `title`
- Kind-specific fields as a definition list (e.g. technology, priority, status, between, addresses…)
- Outgoing/incoming reference chips (from `edges` lookup — link to anchor of target element's heading)
- No prose duplication — the prose is already rendered above the card from the `ProseNode`s

---

## Explore
### Tasks
- [x] Understand monorepo structure and package boundaries
- [x] Read CLI command dispatch pattern (`cli.ts`)
- [x] Read core pipeline: `arc42.ts` → `runPipeline` → `buildWorkspace` → `buildIndex`
- [x] Read AST types: `HeadingNode`, `ProseNode`, `BlockNode`, `DiagramNode`, `DocumentAst`
- [x] Read model types: all Element kinds, `Workspace`, `DiagramArtifact`
- [x] Read renderer types: `GetResult`, `WorkspaceView`, `ElementView`, `Edge`
- [x] Read build config: CLI's `vite.config.ts` (pack + copy pattern)
- [x] Read workspace YAML: pnpm catalog, `apps/*` slot exists but is empty
- [x] Understand diagram notation types and Mermaid source availability
- [x] Clarify user intent: serve command + reuse for own docs site + dual agent/human view

### Completed
- [x] Created development plan file
- [x] Full exploration of codebase completed

---

## Plan
### Tasks
- [x] Define `WorkspacePayload` type and `loadWorkspace()` function placement
- [x] Define SPA file structure under `packages/cli/src/web/`
- [x] Define HTTP server design (pure Node.js `http`, routes, static file serving)
- [x] Define SPA component tree
- [x] Define dual-view toggle behaviour
- [x] Define build pipeline integration (vite build → copy into CLI dist)
- [x] Sequence all Code phase tasks in dependency order

### Completed
*None yet*

---

## Code
### Tasks

#### Step 1 — Core: add `loadWorkspace` + `WorkspacePayload`
- [x] **C01** Add `WorkspacePayload` interface to `packages/core/src/renderer/types.ts`
- [x] **C02** Add `loadWorkspace(dir): Promise<WorkspacePayload>` to `packages/core/src/arc42.ts`
- [x] **C03** Re-export `WorkspacePayload` and `loadWorkspace` from `packages/core/src/index.ts`
- [x] **C04** Fix missing `QualityScenario` re-export in `packages/core/src/index.ts`

#### Step 2 — CLI: `serve` command (Node.js HTTP server)
- [x] **C05** Add `runServe(dir, args)` function to `packages/cli/src/cli.ts`
- [x] **C06** Wire `serve` into `main()` dispatch and update `printHelp()`

#### Step 3 — SPA scaffold
- [x] **C07** Create `packages/cli/src/web/` with `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json`

#### Step 4 — SPA implementation
- [x] **C08** `src/main.tsx`
- [x] **C09** `src/types.ts`
- [x] **C10** `src/App.tsx`
- [x] **C11** `src/Sidebar.tsx`
- [x] **C12** `src/DocumentView.tsx`
- [x] **C13** `src/AstNodeRenderer.tsx`
- [x] **C14** `src/ElementCard.tsx`
- [x] **C15** `src/MermaidDiagram.tsx`
- [x] **C16** `src/AgentBlock.tsx`
- [x] **C17** `src/styles.css`
- [x] **C18-util** `src/utils.ts`

#### Step 5 — Build integration
- [x] **C18** Add `"build:web"` script to `packages/cli/package.json`
- [x] **C19** Update `packages/cli/vite.config.ts` to copy SPA assets into CLI dist
- [x] **C20** Add `packages/cli/src/web` to pnpm workspace for dep resolution

#### Step 6 — Dev workflow
- [ ] **C21** Add `"dev:web"` script (deferred — not needed for v1 functionality)

#### Step 7 — Verification
- [x] **C22** `pnpm -r build` passes; all 207 core tests + 11 CLI tests pass
- [x] **C23** `arc42 serve` starts, serves SPA at `/`, `/api/workspace` returns valid JSON (25 elements, 4 documents, 28 edges)

#### Step 8 — Extract SPA to `packages/web/` (architecture alignment)
- [x] **W01** Move `packages/cli/src/web/` contents to `packages/web/`; rename package to `@arc42/web`
- [x] **W02** Update `pnpm-workspace.yaml`: replace `packages/cli/src/web` with `packages/web`
- [x] **W03** Update CLI `package.json` build scripts; update `vite.config.ts` copy paths to `../../packages/web/dist/`
- [x] **W04** Run `pnpm install` and verify `pnpm build` + all tests pass
- [x] **W05** Update architecture docs chapter 5 CLI description to reflect `@arc42/web` as build-time dep

### Completed
- All implementation tasks done; verified working end-to-end
- W01–W05: SPA extracted to `packages/web/`; all builds and tests pass (207 core + 11 CLI)

---

## Commit
### Tasks
- [ ] Write conventional commit message following project style
- [ ] Stage only intended files (no dist/, no .vibe/)

### Completed
*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
