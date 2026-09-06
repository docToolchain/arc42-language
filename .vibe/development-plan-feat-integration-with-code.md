# Development Plan: arc42-language (feat/integration-with-code branch)

*Generated on 2026-09-06 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Add implementation-artifact paths to interfaces and building-blocks, and validate the consistency of those links with the source repository.
## Key Decisions
- Preserve the existing line-oriented Markdown DSL: `path` is an optional scalar attribute on `building-block` and `interface` blocks.
- Paths may identify either a file or a directory.
- Paths are authored relative to the repository root, not relative to the architecture-document directory.
- Validation checks only whether each authored path exists; it does not scan the repository to discover unmodeled artifacts.
- Every building-block and interface should have a path once implementation artifacts are present, but an absent path produces a hint only.
- A modeled path that cannot be resolved from the repository root is an error.
- Building-block paths may be shared; exact path uniqueness is not required.
- Shared prefixes represent a relaxed hierarchy. Overlapping paths should warn when the overlap does not correspond to a modeled parent relationship.
- Path-related diagnostics use three levels: missing path = hint, unresolved/inconsistent path = error, hierarchy/overlap mismatch = warning.
- Path values are treated as normal model fields and should therefore appear in all existing renderer/API formats, consistently with other violations and fields.
- Add an optional `--root` option for explicitly selecting the repository root.
- Without `--root`, determine the root using a reusable repository-root resolver: try the Git root when the workspace is inside a Git repository, then `--dir`, then the current working directory.
- For relative paths, probe the candidate roots using the first path encountered; once one candidate resolves that path, lock that root-resolution method for all remaining paths so one workspace cannot resolve different paths against different roots.
- Path validation must not allow an authored relative path to escape the selected root through `..`; symlink handling must be consistent and must not silently broaden validation outside the selected root.
- Direct calls to the low-level `validate(workspace, index)` helper retain existing behavior; implementation-path rules activate through `validateWorkspace`, preserving existing rule-unit-test contracts while keeping the public API validation authoritative.
- Empty authored paths are preserved by the builder and reported as unresolved errors; only an omitted `path` attribute produces the missing-path hint.
- Diagnostic codes are self-describing and separately registered: E011 for unresolved paths, H014 for omitted paths, and W018 for hierarchy overlap.
- Architecture-document discovery is sorted to make first-path root selection deterministic across filesystems.
- Web payload types and the ElementCard UI expose implementation paths in addition to core text/Markdown/JSON renderers.

## Notes
- Branch created: `feat/integration-with-code`.
- Workflow started: EPCC (Explore → Plan → Code → Commit), with reviews required.
- The core pipeline is `discoverFiles` → `MarkdownParser` → `buildWorkspace` → `buildIndex` → validator rules.
- `BuildingBlock` and `Interface` are defined in `packages/core/src/model/types.ts`; their Zod schemas and field metadata are in `model/schemas.ts`; parsed attributes are copied into model elements by `model/builder.ts`.
- Built-in validation rules are self-describing and registered in `validator/rules/index.ts`. Diagnostics currently receive only `(workspace, index)` and have severity `error | warning | hint`.
- `Workspace` currently contains elements, parse errors, documents, and diagrams; `ValidateOptions` currently accepts only `dir`.
- `discoverFiles` recursively discovers only `*.arc42.md`, so repository integration needs a separate source-tree scan rather than changing architecture-document discovery.
- Text and Markdown renderers explicitly enumerate element fields and will need path output if the new field is exposed.
- Existing tests are in `packages/core/tests`; there is no separate test directory under `packages/core/src`.
- The public README confirms that `--dir` is currently both the architecture-document root and the validation workspace root; no separate source-root option or configuration file convention is documented.
- Issue #36 is about comparing changed prose and `:::blocks`; issue #38 should provide the artifact links that such a future diff check can use, but does not define that diff behavior itself.

### Remaining question for intent alignment
- None for the current feature scope. Ignore handling is intentionally deferred.

## Explore
### Tasks
- [x] Inspect repository layout, package scripts, and existing development plan.
- [x] Trace parsing, schema validation, model building, workspace loading, and validator registration.
- [x] Inspect model, renderer, and validator extension points for `BuildingBlock` and `Interface`.
- [x] Identify repository discovery constraint: only `*.arc42.md` files are currently loaded as architecture documents.
- [x] Review public README/CLI documentation for workspace-root and configuration conventions.
- [x] Review issue #36 to separate the current path-linking scope from future diff-consistency behavior.
- [x] Resolve path kind, path base, validation strategy, completeness behavior, hierarchy semantics, overlap handling, severities, and renderer/API exposure.
- [x] Resolve repository-root selection and define an explicit `--root` override plus reusable automatic fallback order.

### Completed
- [x] Created development plan file
- [x] Documented exploration findings and initial design constraints
- [x] Recorded the information still needed from the product owner before planning implementation
- [x] Recorded the confirmed path integration semantics and diagnostic severities
- [x] Recorded repository-root resolution and first-path root locking

## Plan
### Tasks
- [x] Confirm that no requirements, architecture, or design documents exist; use the agreed task context as the source of truth.
- [x] Choose the smallest model/API extension: add optional `path` fields to interfaces and building-blocks, add optional `root` to validation/loading options, and keep path resolution internal to validation rather than making repository metadata part of rendered workspace data.
- [x] Choose a reusable root resolver with explicit-root precedence and deterministic automatic fallback: `--root` → Git root → `--dir` → current working directory. Resolve the first authored path against candidates, lock the selected method, and use that root for every later path.
- [x] Separate path validation from architecture-document discovery; never broaden `discoverFiles` beyond `*.arc42.md` and never scan for unmodeled implementation artifacts.
- [x] Define validation rules and severities: absent path on a building-block/interface emits a hint; authored path that cannot be resolved under the locked root emits an error; building-block path hierarchy/overlap inconsistencies emit warnings.
- [x] Define path normalization for comparisons: resolve relative segments without following symlinks, compare path components rather than raw string prefixes, and treat equal paths as allowed sharing.
- [x] Define hierarchy behavior: a nested building-block path is valid when its model relationship identifies the corresponding parent; shared prefixes are allowed as relaxed hierarchy; nested/overlapping paths without that parent relationship warn.
- [x] Plan compatibility coverage for parser/schema/model, core API, CLI, validator registry, text/Markdown/JSON/web output, and tests before implementation.
- [x] Review this implementation strategy, including architecture, compatibility, and path-security concerns; transition to Code after approval.

### Design strategy

1. **Model and parsing**
   - Add `path?: string` to the shared element definitions for `BuildingBlock` and `Interface`.
   - Add the field to the Zod schemas and parser/builder metadata so existing `path: ...` attribute parsing, validation, and serialization follow established conventions.
   - Keep paths as authored relative strings in the model; do not eagerly convert them to absolute paths.

2. **Repository-root resolution**
   - Extend the public validation options and CLI with optional `root`/`--root`.
   - Implement a reusable resolver that can later support Git-dependent features. An explicit root is authoritative. Otherwise, inspect the first authored path in deterministic workspace order against Git root, `--dir`, and the process working directory; lock the first successful resolution strategy for the complete validation run.
   - If no path exists to select a strategy, use the automatic fallback order without probing, so missing-path diagnostics remain deterministic. Normalize the selected root to an absolute path and reject an explicit root that is not a directory with a clear error.

3. **Validation rules**
   - Add a path-presence rule for every building-block and interface. An absent attribute is a hint; an authored path is checked as a file-or-directory path relative to the resolved root, and a failed existence check is an error.
   - Add a building-block hierarchy rule using normalized path components. Equal paths are valid. A nested path is accepted only when the architecture parent relationship matches; otherwise emit a warning. Do not infer a parent from a textual prefix alone.
   - Keep rules deterministic and attach diagnostics to the relevant element/path. Reuse existing rule registration and diagnostic rendering rather than adding a special reporting channel.

4. **Public surfaces**
   - Thread `root` through the core loading/validation API and CLI without changing the existing `--dir` meaning.
   - Include `path` anywhere element fields are currently serialized or rendered: JSON/web payloads, text, and Markdown. Preserve relative authored values; use existing link conventions only if the renderer already supports links for that field type.
   - Update CLI help and user documentation with path syntax, root precedence, and diagnostic severity behavior.

5. **Verification**
   - Add schema/parser/builder tests for optional path values on both element kinds.
   - Add root resolver tests for explicit root, Git root, `--dir`, working-directory fallback, first-path locking, no-path workspaces, and invalid explicit roots.
   - Add validator tests for absent paths (hint), existing file/directory paths, missing paths (error), equal/shared paths, valid parent nesting, and invalid overlap (warning), including cross-document building blocks.
   - Add API/CLI and renderer regression tests, then run the package test/typecheck/build commands.

### Completed
*None yet*

## Code
### Tasks
- [x] Add optional `path` fields to interface/building-block types, schemas, metadata, and builder handling.
- [x] Implement repository-root resolution and extend core validation/loading options with optional `root`.
- [x] Implement path presence/existence and building-block hierarchy/overlap validator rules; register them.
- [x] Expose `--root` in the CLI and update help/documentation.
- [x] Update JSON/web, text, and Markdown renderers to expose path values.
- [x] Add focused unit and integration coverage for parsing, existing/missing/unresolved paths, empty paths, and overlap warnings; expose paths in the web UI.
- [x] Run formatting, typechecking, build, and test verification; fix regressions.

### Completed
- [x] Reviewed implementation for consistency, minimalism, architecture fit, path security, platform independence, deterministic discovery, and complete renderer exposure.
- [x] Fixed reviewer findings: registered E011, normalized platform-specific path separators, sorted discovery, exposed web paths, documented CLI behavior, and distinguished empty from omitted paths.
- [x] `pnpm check` passed.
- [x] `pnpm test` passed (222 tests).
- [x] `pnpm build` passed.

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
