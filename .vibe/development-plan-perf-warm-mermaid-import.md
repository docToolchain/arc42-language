# Development Plan: arc42-language (perf/warm-mermaid-import branch)

*Generated on 2026-09-14 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

`arc42 validate` is slow on its first CLI run because `mermaid` (a large ESM package) is
loaded via a deferred dynamic `import()` only when the first diagram is encountered.
Subsequent runs in the same shell session are fast due to the OS page cache warming up
the mermaid JS files on disk.

The fix: expose a `warmMermaid()` function from `@arc42/mermaid` that kicks off the
dynamic import eagerly at the start of `runValidate()`, running concurrently with the
workspace file scan. When validation actually needs mermaid the import is already
resolved (or nearly so), eliminating the perceived cold-start delay with no change to
the lazy-skip behaviour for runs with no diagrams.

## Key Decisions

- **No static import** — a top-level `import mermaid from "mermaid"` would load mermaid
  unconditionally for every CLI subcommand (lint, get, serve, …) and remove the ability
  to skip it when no diagrams are present. Not worth the trade-off.
- **Kick off in `runValidate()`**, not at CLI top-level — other subcommands don't need
  mermaid; loading it eagerly there would be wasteful.
- **Reuse the existing `getMermaid()` promise cache** — `warmMermaid()` is just a
  fire-and-forget call to `getMermaid()`. No duplication, no second import.
- **Export `warmMermaid` from `@arc42/mermaid`** — keeps the warming logic inside the
  mermaid package where it belongs; CLI stays thin.

## Notes

- `packages/mermaid/src/parser.ts` — dynamic import, promise cache (`mermaidPromise`),
  retry-on-DOMPurify-error logic. `getMermaid()` is private; `parseMermaid` /
  `mermaidSyntaxParser` are the public surface.
- `packages/mermaid/src/index.ts` — public re-exports; `warmMermaid` needs to be added
  here.
- `packages/cli/src/cli.ts:272` — `runValidate()` calls `validateWorkspace(dir, root)`
  immediately; `warmMermaid()` should be called just before that `await`.
- No existing warm/preload export exists anywhere in the codebase.
- Parser test has a 15 s timeout for the first cold mermaid parse — confirms the
  cold-start cost is real and measurable.

## Explore
### Tasks
- [x] Understand validate command call chain
- [x] Locate mermaid dynamic import and caching logic
- [x] Check for any existing warm/preload export
- [x] Identify exact insertion point in CLI

### Completed
- [x] Created development plan file
- [x] Explored `packages/mermaid/src/parser.ts` — dynamic import, promise cache
- [x] Explored `packages/cli/src/cli.ts` — `runValidate()` at line 272
- [x] Explored `packages/mermaid/src/index.ts` — public exports surface
- [x] Confirmed no warm/preload mechanism exists

## Plan
### Tasks
- [x] Define implementation tasks for Code phase
- [x] Confirm insertion point in `runValidate()` (line 287, before `await validateWorkspace`)
- [x] Confirm `getMermaid()` cache semantics (promise is stored in module-level `mermaidPromise`; calling it again after the first call is a no-op — just returns the cached promise)
- [x] Confirm no type changes needed (`warmMermaid` returns `void`; caller uses `void warmMermaid()`)
- [x] Confirm test strategy: existing parser tests cover the happy path; no new unit test needed for `warmMermaid` itself (it is a one-liner delegating to `getMermaid()`). A smoke-run of the full test suite is sufficient.

### Key decisions (Plan phase)
- `warmMermaid()` signature: `export function warmMermaid(): void { void getMermaid(); }` — returns nothing, side-effect only, cannot throw to caller (errors are swallowed by the promise being fire-and-forget; `getMermaid()` already resets the cache on error so a subsequent real call will retry).
- Import in `cli.ts`: `import { warmMermaid } from "@arc42/mermaid"` alongside the existing `validateWorkspace` import. Check exact import path used in that file first.
- No changes to `model.ts`, no new types, no new test files.

### Completed
- [x] Plan phase complete — all decisions captured, implementation tasks handed to Code phase

## Code
### Tasks
- [x] **Task 1**: Add `warmMermaid()` to `packages/mermaid/src/parser.ts` — exported function that calls `void getMermaid()` and returns `void`
- [x] **Task 2**: Re-export `warmMermaid` from `packages/mermaid/src/index.ts`
- [x] **Task 3**: In `packages/cli/src/cli.ts`, import `warmMermaid` from `@arc42/mermaid` and call `void warmMermaid()` at the top of `runValidate()`, before `await validateWorkspace(dir, root)`
- [x] **Task 4**: Build and run tests to verify no regressions — 353 tests pass, 60 test files, no failures

### Key decisions (Code phase)
- **`@arc42/mermaid` added as `devDependency` in `packages/cli/package.json`** — the package was not listed there at all (only `@arc42/core` and `@arc42/workspace-fs` were). The bundler reported UNRESOLVED_IMPORT until the workspace dep was declared and `pnpm install` was re-run. Added under `devDependencies` (not `dependencies`) because mermaid is already bundled into the CLI output; the workspace declaration is only needed for the TypeScript/bundler resolution at build time.
- **`void warmMermaid()` placed inside the `try` block** at the top of `runValidate()`, matching the surrounding style and ensuring any future error surfacing still flows through the existing catch handler.

### Completed
- [x] All four tasks complete; build clean; full test suite passes

## Commit
### Tasks
- [x] Step 1: Code cleanup — no debug output, TODO/FIXME, or commented-out code in any modified file; all console.log/error calls in cli.ts are pre-existing CLI output
- [x] Step 2: Documentation review — no `.vibe/docs/` directory exists; plan file updated with all key decisions from Code phase
- [x] Step 3: Final validation — 353/353 tests pass; build clean; create PR

### Completed
- [x] All commit tasks complete; PR created on branch `perf/warm-mermaid-import`

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
