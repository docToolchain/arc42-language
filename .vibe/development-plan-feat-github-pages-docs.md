# Development Plan: arc42-language (feat/github-pages-docs branch)

*Generated on 2026-09-09 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Build a beautiful product page + static documentation site published to GitHub Pages for the arc42-language project.

**Landing page** — a product page, not a docs page. Sections:
- Hero: strong headline + tagline + install command + CTA links
- Feature highlights: what makes arc42-language different (drift detection, agent-writability, CLI, live serve)
- Verdict cards: 4 real-world AI agent reviews as prominent eye-catchers (TL;DR + metadata)
- "See it in action": links to the live docs and bookstore example sections
- Footer: npm badge, GitHub link

**arc42 docs section** (`/docs/`) — the project's own architecture docs rendered as a live `arc42 build` output (the SPA viewer)

**Bookstore example section** (`/bookstore/`) — the bookstore example rendered as a live `arc42 build` output (the SPA viewer)

The landing page should feel like a modern open-source product site (think: Linear, Vite, Astro's own site). Beautiful but not heavy — clean typography, generous whitespace, the existing color palette, subtle use of the chapter colors.

## Key Decisions

- **`arc42 build` command**: Introduce a new CLI command `arc42 build --dir <workspace> --out <dir>` that produces a fully self-contained static site for a single arc42 workspace. It reuses the existing `packages/web` SPA and injects the workspace JSON as `window.__WORKSPACE__` into `index.html`. **The `main.tsx` already supports this mode** — the dual-mode detection (`window.__WORKSPACE__` vs `/api/workspace`) is already implemented.
- **GitHub Pages structure**: Three sections — landing page, docs workspace, bookstore workspace. Landing page covers README + verdict cards. Each workspace section is a standalone `arc42 build` output.
- **Landing page approach**: New `packages/site` — a Vite+React app styled as a product page. Plain React (no SSG framework needed — single page, no routing complexity). Build output is `packages/site/dist/index.html` + assets, deployed as the root of the GitHub Pages site. Uses the existing CSS design tokens + extends them with product-page-specific styles.
- **Landing page tech**: Vite + React 18 + TypeScript. Markdown rendered via `marked` (already a dependency in `packages/web`). Frontmatter parsed via `gray-matter`. No SSG needed — single HTML page with all content inlined at build time via a Vite plugin or build script.
- **Landing page tone**: Modern open-source product site (Linear, Vite, Astro style) — hero, feature highlights, verdict cards, CTA links, footer. Not a docs page.
- **Source of truth for content**: Markdown files — `README.md`, `docs/arc42/`, `docs/verdicts/`, `examples/bookstore-backend/`
- **Deployment target**: GitHub Pages via a new GitHub Actions workflow
- **Style system**: Reuse the existing design tokens from `packages/web/src/styles.css` for landing page; workspace sections reuse the SPA as-is
- **Verdicts as eye-catchers**: Each verdict file has YAML frontmatter (model, harness, date) and a TL;DR section — rendered as visually distinct cards on the landing page

## How `arc42 serve` works (context for `arc42 build`)

1. `loadWorkspace(dir)` → parses all `.arc42.md` files → produces `WorkspacePayload` JSON
2. Serves `packages/web` SPA (bundled into `cli/dist/web/`) + `/api/workspace` HTTP endpoint
3. `packages/web/src/main.tsx` already has dual-mode: checks `window.__WORKSPACE__` first, falls back to fetch

So `arc42 build` implementation:
1. Call `loadWorkspace(dir)` — same as serve, no new logic
2. Copy `cli/dist/web/` assets to `--out` directory
3. Inject `<script>window.__WORKSPACE__ = JSON.stringify(payload)</script>` into `index.html`
4. Done — ~30-40 lines of new CLI code

## Proposed GitHub Pages site structure

```
site/
  index.html          ← landing page: README content + verdict cards
  docs/               ← arc42 build --dir docs/arc42 --out site/docs
    index.html
    assets/
  bookstore/          ← arc42 build --dir examples/bookstore-backend --out site/bookstore
    index.html
    assets/
```

## SSG Options (for landing page only)

| | VitePress | Astro | New `packages/docs` (plain Vite+React) |
|---|---|---|---|
| **Setup complexity** | Low | Medium | Low-Medium |
| **Markdown + frontmatter** | Native | Native (content collections) | Needs `gray-matter` + Vite plugin |
| **React component reuse** | Needs Vue wrapper | Yes, native via `@astrojs/react` | Yes, direct |
| **CSS token reuse** | Via CSS import | Via CSS import | Direct — same stack |
| **SSG / static output** | Built-in | Built-in | Needs plugin (e.g. `vite-ssg`) |
| **GitHub Pages deploy** | Official guide | Official guide + action | Manual workflow |
| **Bundle size** | Medium (Vue runtime) | Small (zero-JS by default) | Small |
| **Learning curve** | Low (docs-focused) | Low-Medium | Low (already know it) |
| **Custom layout freedom** | Medium | High | Full |

### Option A — VitePress
- Purpose-built for documentation; excellent default theme (dark mode, sidebar, search, code highlighting)
- Vue-based — React components need a wrapper shim, CSS tokens import cleanly
- Fastest path to a polished docs site with minimal config
- Best if the goal is "looks great out of the box, markdown-first"

### Option B — Astro
- Islands architecture: zero JS by default, React components hydrated only when needed
- Native React support via `@astrojs/react` — existing components usable directly
- Content collections give structured frontmatter typing (Zod schemas) — good for verdict cards
- More flexible than VitePress but slightly more setup
- Best if reusing React components is important or maximum control is desired

### Option C — New `packages/docs` (plain Vite + React)
- Stays 100% in the existing stack (React 18, Vite, TypeScript)
- CSS tokens and any components from `packages/web` importable directly
- Requires wiring up Markdown parsing (`vite-plugin-md` or similar) and SSG (`vite-ssg`)
- More boilerplate to build and maintain, but no new framework to learn
- Best if the team wants zero new dependencies and full control

### Recommendation (pending your input)
**Astro** is the most balanced: native React support, first-class Markdown+frontmatter, built-in SSG, clean GitHub Pages deploy, and it doesn't force Vue on a React codebase. VitePress is the fastest path if no React component reuse is needed. Plain Vite is the safest bet if the preference is to stay entirely in the existing stack.

## Notes

### Codebase Context

- **Monorepo structure**: `pnpm` workspaces — `packages/cli`, `packages/core`, `packages/web`, `packages/skill`, `packages/mermaid`, `packages/workspace-fs`
- **`packages/web`**: React 18 + Vite + TypeScript — the `arc42 serve` browser renderer. Has a rich CSS design system with chapter color palette, element cards, sidebar, etc.
- **`docs/arc42/`**: 12 chapter `.arc42.md` files (the project's own architecture docs)
- **`docs/verdicts/`**: 4 verdict files with YAML frontmatter — real-world AI agent reviews of the toolchain
  - `claude-sonnet-46-migration.md` — migration of undocumented codebase
  - `luna-refactoring.md` — core refactoring with arc42 CLI
  - `opencode-arc42-usage.md` — CLI refactoring usage
  - `sonnet-greenfield.md` — greenfield user review
- **`examples/bookstore-backend/`**: 12-chapter complete arc42 workspace (a bookstore backend)
- **Existing CI**: `.github/workflows/ci.yml` — handles build, check, test, release. No GitHub Pages workflow exists yet.
- **Build system**: `vite-plus` (`vp`) unified toolchain

### Content Insights

- **Verdicts** all follow a pattern: YAML frontmatter (model, harness, date), H1 title, `## TL;DR` first, then sections. The TL;DR is the "eye-catcher" content.
- **README** has strong narrative content — good landing page material
- **Bookstore example** is a realistic, complete arc42 workspace — good showcase material
- **arc42 docs** are the project eating its own dog food — worth showing

### Styling Reference

The `packages/web/src/styles.css` defines:
- CSS custom properties for light/dark mode
- Chapter color palette (12 colors, `--c-ch0` through `--c-ch12`)
- Element card system (badge, stripe, fields grid)
- Sidebar layout with sticky navigation

## Explore

### Tasks
- [x] Read plan file for context
- [x] Explore project root structure
- [x] Read README.md
- [x] Explore `docs/` directory (arc42 + verdicts)
- [x] Explore `examples/bookstore-backend/`
- [x] Read verdict files to understand format
- [x] Check existing GitHub Actions workflows
- [x] Check `packages/web` for reusable styling/components
- [x] Understand existing tech stack (React, Vite, pnpm)
- [x] Research SSG options (VitePress, Astro, plain Vite)
- [x] Understand `arc42 serve` internals for `arc42 build` design
- [x] Clarify landing page goal (product page, not docs page)
- [x] Decide landing page approach (`packages/site` Vite+React)

### Completed
- [x] Created development plan file
- [x] Full codebase exploration complete
- [x] SSG options researched and documented
- [x] `arc42 build` approach designed
- [x] Product page goal + landing page stack decided

## Plan

### Design: `packages/site` product page

**Audience:** Software architects. The design must feel precise, professional, and opinionated — not generic. No stock illustrations. No gradients unless subtle. Density is a feature, not a problem.

**Design principles:**
- Minimal surface area — every element earns its place
- Dark mode is the default aesthetic; light mode is equally polished
- Typography carries the design — no decorative elements needed
- Code is a first-class visual element (install snippet, DSL examples)
- Generous vertical rhythm, tight horizontal constraints (max 800px content width)

---

**Dark/light mode strategy:**
- Two states: `"dark"` | `"light"` — one explicit override stored in `localStorage`
- On first visit (no localStorage key): read `window.matchMedia("(prefers-color-scheme: dark)")` to determine the initial displayed state, but do NOT write to localStorage — the system preference is the default, not a stored value
- When the user toggles: write the opposite of the current effective theme to `localStorage`; if the result matches system preference, clear `localStorage` (i.e. if user clicks to dark and system is already dark, remove the override — redundant overrides are cleaned up)
- Apply via `data-theme="dark"` / `data-theme="light"` attribute on `<html>`; absence of the attribute means system wins
- CSS: `:root` = light defaults (no `data-theme` assumed), `[data-theme="dark"]` overrides, `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` — covers all cases
- Toggle button in Nav: sun ☀ icon when in dark mode (click → go light), moon ☾ icon when in light mode (click → go dark). Always shows what you'll switch TO, matching macOS/iOS convention
- Initial inline `<script>` in `index.html` `<head>` applies `data-theme` synchronously before React loads — avoids flash of wrong theme (FOWT)

**CSS token strategy:**
- `packages/site/src/styles.css` duplicates the relevant tokens from `packages/web/src/styles.css` (do NOT import from packages/web — keeps site package self-contained and independently deployable)
- Tokens: `--bg`, `--bg-card`, `--bg-code`, `--border`, `--text`, `--text-muted`, `--text-link`, `--accent`, `--font-sans`, `--font-mono`, `--radius`, all `--c-chN` chapter colors
- Additional site-specific tokens: `--max-w: 800px`, `--nav-h: 56px`, `--section-gap: 6rem`

---

**Page sections (top to bottom):**

1. **Nav bar** (sticky, `--nav-h` tall, `border-bottom: 1px solid var(--border)`)
   - Left: `arc42` wordmark in `--font-mono`, weight 700
   - Center (desktop only): "Docs" link → `/docs/`, "Bookstore" link → `/bookstore/`
   - Right: GitHub icon link, dark/light toggle button (sun ☀ / moon ☾ / system ◑)
   - Mobile: hamburger collapses center links

2. **Hero** (full-viewport-height or min 85vh, vertically centered)
   - Eyebrow label: `ARCHITECTURE · DOCUMENTATION · DRIFT DETECTION` in `--text-muted`, `0.75rem`, letter-spacing `0.12em`, uppercase
   - H1: Two lines — "Architecture docs that" / "**stay correct.**" — `clamp(2.5rem, 6vw, 4rem)`, tight `letter-spacing: -0.03em`, `line-height: 1.1`
   - Subheading: "Human-readable. Agent-writable. Machine-verifiable." — `1.2rem`, `--text-muted`
   - Install snippet: dark pill/box with monospace `npx @doctc/arc42 serve`, copy-to-clipboard icon
   - Two CTA buttons: primary "View architecture docs →" (filled, `--accent`), secondary "See bookstore example →" (outline)
   - Scroll hint arrow at bottom (subtle, animated)

3. **Feature strip** (4 items, 2×2 grid desktop / 1-col mobile, `border: 1px solid var(--border)` grid)
   Each cell: icon (SVG, 24px, `--text-muted`), bold title, one-sentence description
   - **Human-readable** — "Write in plain Markdown. Read in any editor. No tooling required."
   - **Agent-writable** — "AI agents produce valid workspaces from a single syntax reference."
   - **Drift detection** — "Broken references, stale decisions, orphaned components — caught before merge."
   - **Live viewer** — "`arc42 serve` renders your workspace as a navigable, cross-linked site."

4. **Verdict section** (`border-top: 1px solid var(--border)`)
   - Section headline: "Tested in the wild" (left-aligned, `1.5rem`, `font-weight: 700`)
   - Sub-label: "Real AI agents. Real codebases. Unscripted." (`--text-muted`)
   - 4 verdict cards in 2×2 grid (desktop) / 1-col (mobile):
     Each card (`background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius)`, left stripe in a chapter color):
     - Top row: model badge (pill, chapter color background), harness badge (outline pill), date (`--text-muted`, right-aligned)
     - Task label: italic, `--text-muted`, `0.85rem`
     - TL;DR: first 2 sentences of the TL;DR section, `0.9rem`, `line-height: 1.6`
     - Footer link: "Read full verdict →" (`--text-link`, `0.8rem`)
   - Chapter color assignment: card 0 → `--c-ch5` (blue), card 1 → `--c-ch3` (purple), card 2 → `--c-ch6` (green), card 3 → `--c-ch8` (amber)

5. **"See it live" section**
   - Two large cards side by side (`border: 1px solid var(--border)`, hover lifts with `box-shadow`)
   - Card 1: "Architecture Docs" — "The project's own arc42 workspace. 12 chapters, all cross-linked." → links to `/docs/`
   - Card 2: "Bookstore Example" — "A complete e-commerce backend documented with arc42." → links to `/bookstore/`
   - Each card: icon area (top), title, description, "Open →" arrow

6. **Footer** (simple, 1-2 lines)
   - Left: `arc42-language` + npm version badge + CI badge
   - Right: "MIT License · GitHub"
   - `border-top: 1px solid var(--border)`, `padding: 2rem 0`, `--text-muted`

---

**Component file structure for `packages/site/src/`:**
```
main.tsx              — entry point + theme initialisation
App.tsx               — top-level layout, assembles sections
useTheme.ts           — theme state hook (dark/light/system + localStorage)
components/
  Nav.tsx             — sticky nav + theme toggle
  Hero.tsx            — hero section
  FeatureStrip.tsx    — 4-cell feature grid
  VerdictCard.tsx     — single verdict card
  VerdictSection.tsx  — verdict section heading + 2x2 grid
  LiveSection.tsx     — "see it live" two-card section
  Footer.tsx          — footer
styles.css            — all styles (tokens + layout + components)
verdicts.ts           — Verdict type + virtual import reference
```

**Verdict data loading strategy:** A small Vite virtual module plugin (`vite-plugin-verdicts.ts`) reads all `docs/verdicts/*.md` files at build time using Node `fs`, parses YAML frontmatter with `gray-matter`, extracts TL;DR (text between `## TL;DR` and next `##`), truncates to 2 sentences. Exports a typed `Verdict[]` array as a virtual module `virtual:verdicts`. This keeps the React components pure.

**Verdict full-text links:** The verdict `.md` files are **not** part of the SPA — they're standalone Markdown files. For now, the "Read full verdict →" link is disabled or links to the raw GitHub file. Future work: render verdicts as individual pages. Keep it simple for v1.

---

### Design: `arc42 build` CLI command

**Signature:** `arc42 build [--dir <workspace>] [--out <dir>] [--base <url-base>]`
- `--dir` — workspace directory (same resolution as `serve`: flag > env > autodiscover > cwd)
- `--out` — output directory (required; CLI errors if not provided)
- `--base` — optional URL base path for assets (e.g. `/docs/` for GitHub Pages subpath); defaults to `./`

**Implementation in `packages/cli/src/cli.ts`:**
1. Parse args (`--dir`, `--out`, `--base`)
2. Call `loadWorkspace(dir)` → `WorkspacePayload`
3. Validate `--out` is provided
4. Copy `cli/dist/web/` recursively to `--out`
5. Read `--out/index.html`
6. Inject before `</head>`: `<script>window.__WORKSPACE__=<JSON>;</script>`
7. If `--base` provided, rewrite `src="./assets/` and `href="./assets/` to use the base path
8. Write modified `index.html` back
9. Print: `arc42 build  →  <out>` + file count

**Edge cases:**
- `--out` dir already exists: overwrite (no prompt, same as Vite)
- `loadWorkspace` failure: exit 1 with error message
- `cli/dist/web/` missing (unbundled dev): exit 1 with "Run 'pnpm build:web' first"

**Help text:** Add to `packages/cli/src/help.ts` under `build` command.

---

### Design: GitHub Pages workflow

**File:** `.github/workflows/pages.yml`

**Trigger:** push to `main` branch only (not PRs).

**Steps:**
1. Checkout + pnpm setup + Node 24 (same as ci.yml)
2. `pnpm install --frozen-lockfile`
3. `pnpm run build` (builds all packages including CLI and web assets)
4. `pnpm run build:site` (builds `packages/site` → `packages/site/dist/`)
5. `node packages/cli/dist/cli.js build --dir docs/arc42 --out site/docs --base /docs/`
6. `node packages/cli/dist/cli.js build --dir examples/bookstore-backend --out site/bookstore --base /bookstore/`
7. Copy `packages/site/dist/` → `site/` root
8. Deploy `site/` to GitHub Pages via `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`

**Permissions:** `pages: write`, `id-token: write` (standard GitHub Pages OIDC deploy).

---

### Monorepo integration

**New `packages/site/package.json`:**
- `name: @arc42/site`, `private: true`
- Scripts: `build: tsc --noEmit && vp build`, `dev: vp dev`
- Dependencies: `react`, `react-dom`, `gray-matter`
- DevDependencies: same pattern as `packages/web` (vite-plus, @vitejs/plugin-react, typescript, @types/react)

**Root `package.json` scripts to add:**
- `build:site`: `pnpm --filter @arc42/site build`

**`pnpm-workspace.yaml`:** already covers `packages/*` — no change needed.

**`packages/site/vite.config.ts`:** same pattern as `packages/web/vite.config.ts` but without the proxy. Output to `packages/site/dist/`.

---

### Tasks
- [x] Design `packages/site` page structure and components
- [x] Design verdict data loading strategy (Vite plugin)
- [x] Design CSS/styling approach
- [x] Design `arc42 build` CLI command spec
- [x] Design GitHub Pages workflow
- [x] Plan monorepo integration (`package.json`, workspace scripts)

### Completed
- [x] Full plan documented

## Code

### Tasks

#### 1. `arc42 build` CLI command (~40 lines)
- [ ] Add `build` branch in `main()` dispatch in `packages/cli/src/cli.ts`
- [ ] Implement `runBuild(dir, args)` function
- [ ] Add help text for `build` in `packages/cli/src/help.ts`
- [ ] Verify: run `arc42 build --dir examples/bookstore-backend --out /tmp/test-build` and check output

#### 2. `packages/site` scaffold
- [ ] Create `packages/site/package.json`
- [ ] Create `packages/site/tsconfig.json` (copy pattern from `packages/web`)
- [ ] Create `packages/site/vite.config.ts`
- [ ] Create `packages/site/index.html` (entry HTML)
- [ ] Add `build:site` script to root `package.json`

#### 3. Vite verdict plugin + data
- [ ] Create `packages/site/src/vite-plugin-verdicts.ts`
- [ ] Create `packages/site/src/verdicts.ts` (typed interface + virtual import)
- [ ] Test: `pnpm --filter @arc42/site build` produces correct verdict data

#### 4. Landing page components
- [ ] `packages/site/src/styles.css` — design tokens import + product page styles
- [ ] `packages/site/src/components/Nav.tsx`
- [ ] `packages/site/src/components/Hero.tsx`
- [ ] `packages/site/src/components/FeatureStrip.tsx`
- [ ] `packages/site/src/components/VerdictCard.tsx` + `VerdictSection.tsx`
- [ ] `packages/site/src/components/LiveSection.tsx`
- [ ] `packages/site/src/components/Footer.tsx`
- [ ] `packages/site/src/App.tsx` — assemble all sections
- [ ] `packages/site/src/main.tsx` — entry point

#### 5. GitHub Pages workflow
- [ ] Create `.github/workflows/pages.yml`
- [ ] Enable GitHub Pages in repo settings (manual step — note in plan)

### Completed
*None yet*

## Commit

### Tasks
- [ ] Stage and review all changed files
- [ ] Write conventional commit message
- [ ] Push branch and open PR

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
