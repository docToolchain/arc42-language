# Development Plan: arc42-language (feat/github-actions-ci-cd branch)

_Generated on 2026-09-04 by Vibe Feature MCP_
_Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)_

## Goal

Set up GitHub Actions for CI (all branches) and CD (main branch only):

- **CI**: lint + type-check, test, build on every push and PR
- **CD**: on push to main, create a GitHub release, generate a changelog, and publish `@doctc/arc42` to npmjs

## Current release process (manual)

1. Developer runs `pnpm run version:patch/minor/major` — bumps `packages/cli/package.json` version only (`--no-git-tag-version`, so no tag/commit created automatically)
2. Developer commits the version bump manually
3. Developer runs `pnpm run release` → triggers `prepublishOnly` → `vp pack` (build) → `pnpm publish -r --access public`
4. No git tags, no GitHub release, no CHANGELOG

**Problems with current approach:**

- No git tags — no traceability between npm versions and commits
- No CHANGELOG — users/agents have no way to know what changed
- No CI — typos, broken types, or failing tests can be committed and shipped
- Manual steps are error-prone and not documented

## Key Decisions

- Use `release-please` manifest mode targeting `packages/cli` only (root and `packages/core` are private)
- **npm publish uses Trusted Publishing (OIDC) — no `NPM_TOKEN` secret needed.** npm CLI >= 11.5.1 + Node >= 22.14 automatically exchanges the GitHub OIDC token for a short-lived publish credential. Provenance attestations are generated automatically.
- `publishConfig.provenance: true` removed from `packages/cli/package.json` — not needed with Trusted Publishing and breaks local `pnpm publish` (provenance requires CI environment)
- Package name is `@doctc/arc42` (no hyphen in scope) — matches the published npm package
- Tags use `v{version}` format (no component prefix) — cleaner and matches npm convention
- CI runs on all branches on push and PR; publish only runs when release-please merges a release PR into `main`
- `bootstrap-sha`: `0b77ecdeff530676eb61557f5fce8416e2668cb9` — HEAD of `feat/github-actions-ci-cd` before adding workflows; seeds CHANGELOG from here rather than full repo history
- The manual `version:patch/minor/major` + `release` scripts stay for emergency use; normal flow goes through CI/CD
- `pnpm` used (not npm) for install — required since the project uses pnpm workspaces; publish via `pnpm publish`
- **Repo URL fix applied**: `packages/cli/package.json` had `oliverjaegle` in both `homepage` and `repository.url` — corrected to `doctoolchain`. This is required for Trusted Publishing (npm validates the `repository.url` matches the publishing repo).
- `include-component-in-tag: false` → tags become `v0.0.8` not `packages/cli-v0.0.8`
- `bump-patch-for-minor-pre-major: true` → while version < 1.0.0, `feat:` bumps patch not minor (appropriate for early-stage project)
- No `registry-url` needed in `actions/setup-node` for the publish job — Trusted Publishing does not use `NODE_AUTH_TOKEN`
- CI builds `@arc42/core` before `check` because `packages/core/package.json` exports point to `dist/` which doesn't exist at fresh checkout. Adding `types` condition to exports is correct long-term fix but build step is still needed.
- `packages/core` exports updated to include `types` condition (`./dist/index.d.mts`) — proper typing for consumers
- Git hooks use `vp config` / `.vite-hooks/` (not `.githooks/`): pre-commit runs `vp staged` + `validate:source`; pre-push runs `pnpm test` + `pnpm build` for full CI parity
- `packages/cli/vite.config.ts`: removed `exports: true` and `bin: { arc42: ... }` (neither is a valid `PackUserConfig` field); `bin` is already in `package.json` and auto-detected from shebang; `typeCheck`/`typeAware` set to `true` (root cause of CI failure was missing `dist/`, not the config itself)

## Trusted Publishing setup instructions (for user to do manually — one time)

Configure the trust relationship on npmjs.com before the first automated publish:

1. Go to https://www.npmjs.com/package/@doctc/arc42 → Settings → Trusted publishing
2. Click "Add trusted publisher" → select **GitHub Actions**
3. Fill in:
   - Organization or user: `doctoolchain`
   - Repository: `arc42-language`
   - Workflow filename: `release.yml`
   - Environment name: (leave blank)
   - Allow direct publish: checked (release-please PR merge is the human gate)
4. Save

That's it — no token to store in GitHub. The publish job uses `id-token: write` permission to get an OIDC token, which npm exchanges for a short-lived publish credential automatically.

## Files created / modified

### `.github/workflows/ci.yml`

- Trigger: `push` and `pull_request` on all branches
- Job `ci`: checkout → pnpm 10.32.1 → node 22 → `pnpm install --frozen-lockfile` → **build core** → `pnpm run check` → `pnpm run test` → `pnpm run build`

### `.github/workflows/release.yml`

- Trigger: `push` on `main` only
- Job 1 `release-please`: runs `googleapis/release-please-action@v4`, outputs `releases_created`
- Job 2 `publish` (runs only if `releases_created == 'true'`):
  - permissions: `id-token: write`, `contents: read`
  - checkout → pnpm 10.32.1 → node 22 (no `registry-url`) → install → build → `pnpm --filter @doctc/arc42 publish --access public --no-git-checks`
  - No `NODE_AUTH_TOKEN` — Trusted Publishing handles auth via OIDC

### `release-please-config.json` (repo root)

Manifest mode, `packages/cli` only, `include-component-in-tag: false`, `bump-patch-for-minor-pre-major: true`, `bootstrap-sha: 0b77ecd`

### `.release-please-manifest.json` (repo root)

Seeds `packages/cli` at version `0.0.7`

### `packages/cli/package.json` changes

- Name: `@doc-tc/arc42` → `@doctc/arc42`
- `homepage`: `oliverjaegle` → `doctoolchain`
- `repository.url`: `oliverjaegle` → `doctoolchain`
- Added `publishConfig.access: "public"` (removed `provenance: true` — breaks local publish)
- Version: `0.0.7` (manually bumped before first publish)

### `packages/core/package.json` changes

- exports: added `types` condition pointing to `./dist/index.d.mts`

### `.vite-hooks/pre-commit` and `.vite-hooks/pre-push` (new)

- pre-commit: `vp staged` + `pnpm run validate:source`
- pre-push: `pnpm run test` + `pnpm run build`

### `vite.config.ts` (root)

- Restored `ignorePatterns` workaround removed; root cause fixed by building core first in CI

## Explore

### Completed

- [x] Review current manual release scripts (`package.json`, `packages/cli/package.json`)
- [x] Check existing git history and tag strategy (no tags currently, Conventional Commits used)
- [x] Check published npm versions (`0.0.7` on npm as `@doctc/arc42`)
- [x] Check node/pnpm version requirements (node >=22.6, pnpm@10.32.1)
- [x] Check if `.github/workflows/` exists (directory exists but empty)
- [x] Check remote URL — confirmed `doctoolchain/arc42-language`
- [x] Identify `oliverjaegle` repo URL bug in `packages/cli/package.json`
- [x] Research release-please manifest mode for monorepos
- [x] Research npm provenance / OIDC publishing options
- [x] Research npm Trusted Publishing (OIDC) — confirmed viable, no token needed, provenance automatic

## Plan

### Completed

- [x] Confirm `bootstrap-sha` value (HEAD of branch: `0b77ecd`)
- [x] Decide on publish auth approach → npm Trusted Publishing (OIDC), no NPM_TOKEN
- [x] Identify repo URL and package name fixes needed in `packages/cli/package.json`
- [x] Finalize exact content of all 5 files (2 workflows, 2 release-please configs, 1 package.json change)
- [x] Document Trusted Publishing setup instructions (one-time manual step on npmjs.com)

## Code

### Tasks

_None remaining_

### Completed

- [x] Fix `packages/cli/package.json`: correct repo URLs, package name, add `publishConfig.access: "public"`
- [x] Create `release-please-config.json` and `.release-please-manifest.json`
- [x] Create `.github/workflows/ci.yml` and `.github/workflows/release.yml`
- [x] Switch `release.yml` to Trusted Publishing (no token, no `registry-url`)
- [x] Fix CI: build core before check (`@arc42/core` types require `dist/` to exist)
- [x] Fix `packages/core/package.json` exports: add `types` condition
- [x] Fix lint errors: `inArc42Fence`, unused `workspaceFromContent`, remove invalid `vite.config.ts` pack fields
- [x] Add `.vite-hooks/pre-commit` and `.vite-hooks/pre-push` for local CI parity
- [x] Update `hooks:install` script to use `vp config`
- [x] CI green: 2 consecutive passing runs on `feat/github-actions-ci-cd`

## Commit

### Tasks

- [ ] PR #13 ready to merge (CI passes)
- [ ] Remind user to configure Trusted Publisher on npmjs.com before merging

### Completed

- [x] All commits pushed to `feat/github-actions-ci-cd`
- [x] PR #13 created: https://github.com/docToolchain/arc42-language/pull/13

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
