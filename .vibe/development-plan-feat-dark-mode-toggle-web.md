# Development Plan: arc42-language (feat/dark-mode-toggle-web branch)

*Generated on 2026-09-09 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Add a dark mode toggle button to `packages/web` (the arc42 doc viewer app), mirroring the two-state toggle already in `packages/site`. Also fix Mermaid diagrams to use a dark theme when dark mode is active so they remain high-contrast.

## Key Decisions
- Copied `useTheme` hook verbatim from `packages/site/src/useTheme.ts` with one addition: `applyTheme(getStoredTheme())` is called on mount so the DOM attribute is set immediately from localStorage (the site version relies on its own SSR/hydration setup).
- CSS: added `[data-theme="dark"]` and `[data-theme="light"]` attribute selectors alongside the existing `@media (prefers-color-scheme: dark)` block. The attribute selectors have higher specificity and act as overrides, while the media query remains for the no-JS / system-default case.
- `MermaidDiagram` now reads theme via a `MutationObserver` on `document.documentElement[data-theme]` plus a `matchMedia` listener. It re-calls `mermaid.initialize()` and re-renders on each theme change. Each render uses a unique id (`diagramId-theme`) to bypass Mermaid's internal SVG cache.
- Theme toggle button is placed in `sidebar__header` next to the existing view-mode toggle. Uses `☾` (crescent) for light-mode state and `☀` (sun) for dark-mode state — minimal footprint, no icon library dependency.
- Theme state is owned by `App.tsx` via `useTheme()`, passed to `Sidebar` as `theme` + `onToggleTheme` props (same pattern as `viewMode` / `onToggleViewMode`).

## Notes
- Build verified: `pnpm --filter @arc42/web build` → TypeScript clean, Vite build successful.
- The chunk-size warnings were pre-existing (mermaid/cytoscape bundles) — not introduced by this change.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] Read and understood all relevant source files

## Plan
### Tasks

### Completed
- [x] Planned implementation: useTheme hook, CSS selectors, Sidebar toggle, App wiring, MermaidDiagram theme reactivity

## Code
### Tasks

### Completed
- [x] Write `packages/web/src/useTheme.ts`
- [x] Update `packages/web/src/styles.css`: add `[data-theme="dark"]` and `[data-theme="light"]` selectors
- [x] Update `packages/web/src/Sidebar.tsx`: add `theme` + `onToggleTheme` props, render theme toggle button
- [x] Update `packages/web/src/App.tsx`: call `useTheme()`, pass `theme` + `toggleTheme` to `<Sidebar>`
- [x] Update `packages/web/src/MermaidDiagram.tsx`: remove module-level `mermaid.initialize`, add `useMermaidTheme` hook with MutationObserver, re-initialize and re-render on theme change
- [x] Build verification: `pnpm --filter @arc42/web build` — passes, zero TS errors

## Commit
### Tasks
- [ ] Commit the changes with a conventional commit message

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
