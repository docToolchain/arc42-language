# Development Plan: arc42-language (feat/publish-npm-package branch)

*Generated on 2026-09-03 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Publish the `@doctc/arc42-cli` package to npmjs for the first time at version 0.1.0.
The CLI is the only public entrypoint. The skill (`packages/skill/SKILL.md`) and starter
templates (`templates/starter/*.arc42.md`) must be bundled into the package and accessible
via two new CLI commands: `arc42 init skill` and `arc42 init template`.

## Key Decisions

- **Namespace**: `@doctc` (owned by the user). CLI package name: `@doctc/arc42-cli`.
- **Core is internal**: `@arc42/core` will NOT be published. The CLI build must bundle core
  so there are no runtime npm dependencies.
- **Single published package**: only `packages/cli` goes to npm. `packages/core` stays private.
- **Version**: `0.1.0` (already set in both package.json files — no change needed).
- **Bin name**: currently registered as `cli` in package.json — must be renamed to `arc42`.
- **Bundling strategy**: vite-plus (tsdown) supports `noExternal` on the `pack` config key.
  Add `noExternal: ["@arc42/core"]` so the published `dist/cli.mjs` is fully self-contained.
  The current dist confirms `@arc42/core` is an external ESM import — this must be inlined.
- **Skill & templates shipping**: vite-plus `pack.copy` feature copies arbitrary files into
  the output dir at build time. Use `copy` entries in `vite.config.ts` to place
  `packages/skill/SKILL.md` → `dist/skill/SKILL.md` and all 12 `templates/starter/*.arc42.md`
  → `dist/templates/` — no separate copy script needed.
- **`files` field**: already `["dist"]` — skill and templates land in `dist/` so no change needed.
- **New commands**:
  - `arc42 init skill [--path <dest>]` — copies `dist/skill/SKILL.md` to
    `.agents/skills/arc42/SKILL.md` relative to cwd by default; `--path` overrides destination.
    Creates parent dirs if needed. Errors if dest file already exists (no silent overwrite).
  - `arc42 init template [--dir <path>]` — copies all 12 `dist/templates/*.arc42.md` files
    to target dir (defaults to cwd; `--dir` overrides). Skips files that already exist and
    prints a warning per skipped file. Prints how many files were copied on success.
- **Runtime file resolution**: use `import.meta.url` + `fileURLToPath` + `path.resolve` to
  locate `dist/skill/` and `dist/templates/` relative to the running CLI binary — this works
  whether the CLI is installed globally, locally, or run via `node dist/cli.mjs`.
- **Skill `packages/skill/SKILL.md` update**: add a "Getting started" section describing
  `arc42 init template` so agents know they can scaffold starter files with one command.
- **`packages/core/package.json`**: add `"private": true` to prevent accidental publishing.
- **npm metadata fields**: add `repository`, `keywords`, `homepage` to CLI `package.json`.

## Notes

- Both `@arc42/cli` and `@doctc/arc42-cli` return 404 on npm — clean slate, first publish.
- Current CLI dist is only 222 lines because core is an external ESM import. After bundling
  it will be a single larger self-contained file — no runtime dependencies needed.
- The `files` array in `packages/cli/package.json` currently only includes `dist/`. Skill
  and templates will be copied into `dist/` during the build, so no `files` change is needed.
- `pnpm publish` will resolve `workspace:*` deps before publishing — but since core won't be
  a published package, we must ensure the CLI bundle has no reference to `@arc42/core` at
  runtime (bundle it in via `noExternal`).
- `packages/core/package.json` should be kept private (add `"private": true`) to prevent
  accidental publishing.
- The `prepublishOnly` script already runs the build — we just need the build to produce the
  right output.
- vite-plus `copy` CopyEntry: `{ from, to?, flatten?, verbose?, rename? }`. `to` defaults
  to `outDir` (`dist/`). To put skill under `dist/skill/` use `to: "dist/skill"`. To put
  templates under `dist/templates/` use `to: "dist/templates"` with `flatten: true`.
- `noExternal` on the `pack` key: confirmed from tsdown type definitions that it is a valid
  field (`noExternal?: Arrayable<string | RegExp> | NoExternalFn`).

## Explore

### Tasks
- [x] Understand monorepo structure
- [x] Check current package names and versions
- [x] Verify what is/isn't bundled in CLI dist
- [x] Check npm for name availability
- [x] Identify all files that need to ship with the package
- [x] Understand new commands needed (init skill, init template)
- [x] Confirm vite-plus bundling API (`noExternal`, `copy`)

### Completed
- [x] Created development plan file
- [x] Full exploration complete

## Plan

### Tasks
- [x] Define exact file changes needed (which files, what changes)

### Completed
- [x] Confirmed `noExternal` is the correct vite-plus/tsdown API for inlining `@arc42/core`
- [x] Confirmed `copy` CopyEntry API for shipping skill and templates into dist
- [x] Designed `init skill` and `init template` command behaviour (defaults, flags, error handling)
- [x] Decided runtime path resolution strategy (`import.meta.url` relative to binary)
- [x] Added skill update to Code tasks (document `arc42 init template` in SKILL.md)

## Code

### Tasks
- [x] `packages/core/package.json`: add `"private": true`
- [x] `packages/cli/package.json`:
    - rename `name` → `@doctc/arc42-cli`
    - rename bin key `cli` → `arc42`
    - add `repository`, `keywords`, `homepage` fields
    - remove `@arc42/core` from `dependencies` (moved to `devDependencies` — bundled at build time)
- [x] `packages/cli/vite.config.ts`:
    - add `deps.alwaysBundle: ["@arc42/core"]` to inline core (replaced deprecated `noExternal`)
    - add `copy` entries to ship `packages/skill/SKILL.md` → `dist/skill/` and
      `templates/starter/*.arc42.md` → `dist/templates/`
- [x] `packages/cli/src/cli.ts`:
    - add `arc42 init skill [--path <dest>]` subcommand
    - add `arc42 init template [--dir <path>]` subcommand
    - update `printHelp()` to document both new commands
    - add `import.meta.url`-based `__dirname` for bundled asset resolution
- [x] `packages/skill/SKILL.md`:
    - added "Scaffold a new workspace" subsection documenting `arc42 init template` and
      `arc42 init skill` so agents know how to scaffold new workspaces
- [x] Build and verify: `pnpm --filter @doctc/arc42-cli build`
    - confirmed `dist/cli.mjs` has no `import ... from "@arc42/core"` line (97 kB self-contained)
    - confirmed `dist/skill/SKILL.md` and all 12 `dist/templates/*.arc42.md` exist
- [x] Smoke test the commands locally
    - `init template --dir <path>`: copies 12 files, exits 0
    - `init template` re-run: skips all 12 with warning, exits 0
    - `init skill --path <dest>`: copies SKILL.md, exits 0
    - `init skill` re-run on same dest: errors with clear message, exits 1
- [x] Dry-run publish: `pnpm --filter @doctc/arc42-cli publish --dry-run --no-git-checks`
    - confirmed tarball includes: `dist/cli.mjs` (97 kB), `dist/skill/SKILL.md`, all 12 templates,
      `package.json`, `LICENSE` — 16 files, 36.7 kB gzipped

### Key decisions during Code phase
- `deps.alwaysBundle` used instead of deprecated `noExternal` (both work; no-warning form preferred)
- `@arc42/core` moved from `dependencies` to `devDependencies` — it's bundled, not a runtime dep,
  so it must not appear as a runtime npm requirement in the published package.json
- `copy` paths are relative to the monorepo root (`../../packages/skill/SKILL.md`) — vite-plus
  resolves them relative to the config file location
- `arc42 init skill` section removed from `packages/skill/SKILL.md` — agents don't need to know
  how to install the skill; that's human/README territory
- README updated: leads with install command, `init template` and `init skill` shown upfront,
  "AI agent use" section updated to reference CLI command instead of manual file copy
- Bundle confirmed clean: only `node:` built-ins as external imports; shebang + executable bit set;
  runs directly without `node` prefix; 34 test files / 176 tests all passing

### Completed
All code tasks done. Build, smoke tests, and dry-run publish all pass.

## Commit

### Tasks
- [ ] Stage and commit all changes
- [ ] Tag `v0.1.0`
- [ ] Push branch and open PR

### Completed
*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
