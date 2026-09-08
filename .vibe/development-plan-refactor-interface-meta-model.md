# Development Plan: arc42-language (refactor/interface-meta-model branch)

*Generated on 2026-09-08 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Evaluate and, if justified, rework the interface meta-model so that provided/required interface
semantics are not conflated with consumer-provider relationships, while preserving a deliberate
migration path for existing `.arc42.md` documents and the web/API contracts.
## Key Decisions
- Start from the completed core/workspace refactor baseline on `refactor/interface-meta-model`.
- Treat issue #54 as the initial scope and research reference.
- Model provided and required interfaces separately instead of using one undirected `between` tuple.
- Actors may only require interfaces; they do not provide interfaces in the model.
- Building blocks may provide interfaces, and provided interfaces are grouped with their providing
  building block.
- Building blocks may require interfaces provided by other building blocks.
- Every interface requirement must reference a modeled provided interface by ID; an unfulfilled or
  unknown requirement is invalid.
- Incompatible DSL and API changes are allowed; backwards compatibility is not a constraint.
- Use explicit `provider` on each interface and `requires` lists on actors and building blocks. Keep
  interfaces as first-class elements, but document them under the building block that provides them.
- Restrict interface providers to building blocks. Actors cannot provide interfaces.
- Derive consumer-to-provider relationships from `requires` references and the interface's `provider`;
  do not duplicate consumer IDs on provided interfaces.
- Replace the current `between` field and `between` resolver relation entirely.
- Retain the ordered consumer → provider relationship as a derived projection, not as a second
  canonical model relationship or a synthetic primitive resolver edge. Compute it through one shared
  helper from validated `requires` and `provider` data.
- Treat the projection helper as an internal core API: it is a provided implementation interface of
  the resolver/core boundary, consumed by validators, renderers, and web adapters. Do not represent
  that code-level contract as an `.arc42.md` architectural `interface`; the DSL models architecture
  boundaries, while TypeScript exports model implementation boundaries.
- Reject a building block requiring an interface whose provider is that same building block with
  diagnostic E015. This keeps the derived projection acyclic at the local relationship level while
  still allowing dependency cycles between distinct providers.
- Keep the derived projection internal to the core resolver/index. It is consumed by validators and
  core logic, but is not included in the filesystem/web workspace payload because no current web
  consumer needs it; the payload exposes canonical `provides`/`requires` edges and model fields only.
- Keep `BuildingBlock.requires` non-optional in the TypeScript model, matching builder normalization to
  `[]`. Optionality exists only in the DSL schema input, not in the built model contract.
- Do not implement until the exact syntax, resolver edges, validation rules, and rendering contracts
  have been designed and documented.

## Notes
- The current model is `Interface { between: [consumer, provider] }`; tuple order is currently the
  implicit direction convention.
- The prior development explicitly deferred a full provided/required interface model because it may
  affect schemas, resolver edges, validators, renderers, web payloads, templates, examples, and
  existing workspaces.
- The repository branch was created from commit `ffc90e9` of the completed refactor.
- Existing architecture/design/requirements files under `.vibe/docs/` should be consulted if present;
  the previous development recorded that design and requirements files were absent.
- The desired semantic direction is now explicit: actors require only; building blocks provide and may
  require; requirements point by ID to provided interfaces; provider ownership is visible in the
  document structure and model.
- Exploration found the current interface model affects schemas, model types, builder, resolver,
  E004/H004/H008/H011/H016/W022/W023, renderers, web types, templates, examples, and direct model
  tests. The current resolver emits two undirected `between` edges from the interface to its endpoints.
- Proposed replacement model:
  - `Interface.provider: string` identifies exactly one providing building block.
  - `BuildingBlock.requires: string[]` and `Actor.requires: string[]` identify required interfaces.
  - Resolver edges become provider → interface (`provides`) and consumer → interface (`requires`);
    consumer → provider is derived when diagram or runtime logic needs it.
- A thinker review compared raw derivation, materialized graph edges, and a shared projection helper.
  The chosen approach is the helper: it avoids stale duplicate state while preventing W022/W023,
  renderers, and web code from reimplementing the join independently.
- The helper itself illustrates the distinction being introduced: its TypeScript contract is a provided
  interface consumed by several implementation modules, but it is not an architectural interface
  element. The implementation should make this ownership/consumption boundary explicit in exports and
  tests without expanding the DSL scope.
- User clarification supersedes the earlier optionality proposal: actors must declare at least one
  `requires` interface; building blocks may omit `requires` and normalize omission to `[]`. Provider
  and requirement references remain strict cross-references.
- Building-block structure validation applies to documents that contain building-block elements. An
  interface must be a direct subheading within the section of its provider, in the same document and
  after the provider block; context-view interface descriptions remain independent of chapter 5
  grouping.
- Interface headings should name the provider-owned contract rather than encode a consumer/provider
  arrow. For example, use `Renderer Registry Interface` instead of `Validator → Renderer Interface`.
- Provider-owned headings should avoid repeating the consumer. For example, use `Core Library API` or
  `CLI Workspace API`, while the interface prose can explain who consumes the contract.
- An interface block documents the provider-owned contract; consumption is represented separately by
  the consumer building block's `requires` field. Interface implementation paths therefore point to
  the provider side, not the consumer's call site.
- System context diagrams show the system boundary and actor-facing building blocks only. A listed
  building block must provide at least one interface directly required by an actor; internal-only
  providers belong in the building-block view, not the context view.
- Keep `packages/skill/SKILL.md` as a brief navigation entry point. Chapter-specific authoring rules
  belong in starter templates and `arc42 guide chapter <number>`, not duplicated in the installed
  skill.
- Test migration policy: remove tests that assert package layout, import paths, or other structural
  implementation details; preserve tests for observable resolver, adapter, query, and renderer
  behavior at the package boundary that owns it.
- Keep the canonical `packages/core/tests/renderer.test.ts` filename while replacing structural
  assertions with focused renderer behavior coverage; a new filename is unnecessary for this
  re-engineering.
- Commit review: the branch contains several intentional earlier workspace/watch/ignore refactors,
  but also WIP commit subjects. Preserve the thematic boundaries, then squash WIP sequences into
  reviewable commits before merging rather than merging the current 14-commit history verbatim.

## Explore
### Tasks
- [x] Inspect current interface syntax, schema, model, resolver, validators, renderers, web contracts,
  templates, examples, and documentation.
- [x] Compare the current model with Arc42 guidance and identify concrete provider/consumer use cases.
- [x] Determine whether an additive model, explicit provider/consumer fields, or separate interface and
  relationship concepts best fits the repository.
- [x] Define migration and compatibility requirements before implementation.
- [x] Decide whether requirements are represented as a dedicated block, a field on building blocks, or
  another explicit model element, and define how actor requirements are expressed.
- [x] Define relationship derivation and validation for interface requirements referencing providers.
- [x] Evaluate whether ordered consumer → provider relationships should remain available internally for
  diagrams and other consumers.
- [x] Establish the preferred incompatible model: explicit `provider` plus `requires`, with derived
  consumer-to-provider relationships and provider grouping in architecture prose.

### Completed
- [x] Created development plan file
- [x] Created branch `refactor/interface-meta-model` from the completed refactor baseline.
- [x] Started the EPCC workflow.

## Plan
### Tasks
- [x] Decide exact block syntax/defaults for `provider` and `requires`: actor requirements are
  mandatory, while building-block requirements are optional and default to `[]`.
- [x] Specify resolver edge semantics and the query/diagram projection from requirement to provider.
- [x] Map validator rule replacements and define new diagnostics for invalid provider/requirement refs.
- [x] Define the migration edits for templates, examples, architecture docs, and tests.
- [x] Choose a shared derived interface-relationship projection instead of materialized synthetic graph
  edges.

### Design
#### DSL and model
- Replace `interface.between` with mandatory `interface.provider: <building-block-id>`.
- Add `requires: <interface-id>[, <interface-id>...]` to `actor` and `building-block` blocks.
- Actors must declare one or more `requires` interface IDs. Building blocks may omit `requires`, which
  normalizes to `[]`.
- Keep `interface` as a first-class block rather than introducing Markdown nesting. Provider grouping
  is expressed by placing interface sections with the providing building block and enforced formally by
  the `provider` reference.
- A provider must be a building block. Actors cannot provide interfaces.
- A requirement must resolve to an existing interface. The interface's provider is then the required
  provider; no consumer list is stored on the interface.
- Reject self-requirement when a building block requires an interface that it provides. This prevents
  meaningless cycles while allowing ordinary dependency cycles between distinct building blocks.

#### Resolver and graph projection
- Emit `{ from: providerId, to: interfaceId, relation: "provides" }` for each interface.
- Emit `{ from: consumerId, to: interfaceId, relation: "requires" }` for each actor/building-block
  requirement.
- Remove the `between` relation and all tuple-order interpretation.
- Provide a shared derived projection for consumer → provider lookups: follow `requires` to the
  interface, then `provider`. Diagram and runtime validators use this projection rather than inventing
  duplicate graph edges.
- Implement the projection as a fresh `DirectedInterfaceEdge[]` result containing `{ consumer, provider,
  interface }`. It must support multiple consumers per interface and actor consumers.
- Keep primitive `Edge[]` limited to model references (`provides` and `requires`); do not add a synthetic
  `communicates`/`uses-via` relation to the canonical edge union.
- Expose the projection separately to web consumers when needed, rather than merging derived edges into
  the primitive edge list. This makes the distinction between source relationships and visualization
  projections explicit.
- Place the helper in the core resolver/projection API, with a stable exported result type. Validators,
  renderers, and web adapters consume that API instead of duplicating its logic. Keep this boundary
  implementation-internal and independent of the Markdown `Interface` block name.
- Preserve interface IDs as diagram labels and references; protocol/title rendering remains unchanged.

#### Validation
- Reuse strict cross-reference validation for `interface.provider`, actor `requires`, and building-block
  `requires`, with target-kind checks for provider and requirement targets.
- Replace E004 with provider-kind validation: an interface provider must be a building block.
- Replace H004 with a provider/usage-oriented building-block diagnostic based on provided interfaces and
  requirements rather than `between` membership.
- Replace H008 with an actor-requires validation error (or the repository's established mandatory-field
  diagnostic) when an actor omits `requires` or declares an empty list.
- Adapt H011 and H016 to use provider plus derived consumers.
- Adapt W022 and W023 so a diagram edge from A to B is covered when A requires an interface whose
  provider is B; remove tuple-order checks.
- Make W022, W023, H011, H016, and any renderer reverse lookup consume the shared projection helper;
  no validator or renderer should independently reconstruct the consumer/provider join.
- H008 remains a defense-in-depth check for programmatically constructed workspaces; parsed actors with
  missing or empty `requires` are rejected earlier by the schema/builder.
- Add focused diagnostics/tests for missing actor requirements, duplicate requirements, unknown
  interfaces, invalid providers, and self-requirements. Existing generic E002 behavior should remain
  the source of unresolved-reference errors where possible.

#### Rendering and contracts
- Text and Markdown renderers print `provider` for interfaces and `requires` for actors/building blocks.
- JSON/core and web payloads expose the new fields and the `provides`/`requires` edge relations.
- Do not expose the derived directed interface projection through the filesystem/web payload until a
  concrete consumer needs it. Test the payload behavior through canonical edges and model fields.
- Update explain metadata, public exports, web types, and any edge relation unions together so no stale
  `between` contract remains.

#### Migration and documentation
- Migrate every existing `between: consumer, provider` to `provider: provider` and add the corresponding
  interface ID to the consumer's `requires` list.
- Update templates, bookstore examples, inconsistent fixtures, architecture chapters, tests, and any
  prose that describes tuple direction.
- Add a design/architecture note in the development plan because no `.vibe/docs/architecture.md` or
  `.vibe/docs/design.md` exists.

#### Implementation order
1. Change model schemas, types, builder defaults, explain metadata, and parser-focused tests.
2. Change resolver types/edges and add derived consumer-provider lookup tests.
3. Rewrite/adapt validators and diagram/runtime validation tests.
4. Update core renderers and web contracts/components.
5. Migrate templates, examples, architecture documents, and all remaining fixtures.
6. Run package tests, type checks, workspace validation, and the full repository validation suite.

### Completed
*None yet*

## Code
### Tasks
- [x] Implement the model/schema/builder/explain changes.
- [x] Implement resolver edge and consumer-provider projection changes.
- [x] Add and test the shared directed interface projection, including multiple consumers and actor
  consumers; wire it into validators and web payloads as a separate projection.
- [x] Implement validator changes and focused edge-case tests.
- [x] Update core/web renderers and contracts.
- [x] Migrate templates, examples, docs, and fixtures.
- [x] Run the full test/typecheck/validation suite and resolve all errors and warnings.

### Completed
- [x] Implemented the model/schema/builder/explain changes.
- [x] Implemented canonical resolver edges and the shared derived consumer-provider projection.
- [x] Added projection coverage for multiple consumers and actor consumers, including self-requirement
  rejection.
- [x] Implemented the provider/requirement validator adaptations and focused edge-case coverage.
- [x] Updated core renderers, web contracts, and workspace payload projection fields.
- [x] Migrated active templates, examples, architecture documents, tests, and fixtures from `between`.
- [x] Ran formatting, type checks, all repository tests (48 files / 249 tests), builds, and strict
  docs/example validation. The valid bookstore example has zero errors/warnings; its existing risk
  hints remain intentionally unchanged.
- [x] Addressed review feedback: removed unused underscore conventions, made normalized building-block
  requirements non-optional in the built model, simplified W002, guarded H011's orphan-interface case,
  documented actor cross-references, and replaced the filesystem payload key-shape assertion with
  behavioral canonical-edge assertions.
- [x] Completed second review: corrected stale `ConstraintSchema` cross-reference metadata, added the
  missing `ActorSchema.requires` metadata, removed redundant null guards from the non-optional model
  contract, and removed unused public `DirectedInterfaceEdge` type mirrors.
- [x] Add W027, a building-block structure warning for interfaces documented outside their provider
  section.
- [x] Add focused W027 tests and migrate building-block interface headings in docs, examples, and
  templates to provider-oriented names and nesting.

### Follow-up Completed
- [x] W027 requires interfaces in building-block documents to appear as direct subheadings of their
  provider, while context-view interface descriptions remain independent.
- [x] Consumer/provider arrow headings were replaced with provider-oriented contract names in the
  canonical building-block documentation, bookstore example, starter guidance, and skill guidance.
- [x] Verification passed: 49 test files / 253 tests, clean type/lint/format checks, source validation
  with zero errors and warnings, and a successful production build. The bookstore example retains its
  five existing H007 risk hints.
- [x] Removed redundant overview wording and renamed provider headings in the building-block chapter
  so interface headings describe the provided contract without repeating the consumer arrow.
- [x] Validate that system context diagrams contain only building blocks with interfaces directly
  consumed by actors.
- [x] Remove internal-only building blocks from context diagrams and add focused coverage for the
  actor-facing context boundary.

### Context Boundary Completed
- [x] Added W028 for internal-only building blocks in system context diagrams and documented the
  actor-facing boundary convention in the skill guidance.
- [x] Removed `bb-core` from the canonical context diagram because actors consume the CLI, skill,
  workspace, and web renderer directly, not the internal core library.
- [x] Verified 50 test files / 256 tests, clean checks, and source validation with zero errors and
  warnings. Existing five H007 risk hints remain unchanged.
- [x] Kept the installed skill brief and moved chapter-specific interface/context guidance into the
  chapter templates and `arc42 guide` output.
- [x] Re-engineer focused behavior coverage for renderer/query behavior that was mixed into the
  removed structural renderer test; do not restore its implementation-shape assertions.

### Behavior Coverage Completed
- [x] Added in-memory core behavior tests for canonical sorting, type filtering, reference resolution,
  missing-element queries, text/JSON rendering, Markdown links/prose, and heading slugs.
- [x] Verified 51 test files / 263 tests and clean formatting, lint, and type checks.

## Commit
### Tasks
- [x] Create the commit for the completed interface meta-model refactor.
- [x] Commit the provider-owned interface structure validation and documentation cleanup.
- [x] Commit the concise-skill and actor-facing-context guidance changes.
- [x] Commit the re-engineered renderer behavior coverage.

### Completed
- [x] Squashed the workspace/core boundary WIP sequence as `260d3bd` (`refactor: split core processing responsibilities`).
- [x] Retained `254bbbd` (`docs: declare diff containment in building blocks diagram`) and `182bd52`
  (`feat: enforce building block documentation hierarchy`) as focused commits.
- [x] Squashed the interface-model, provider-structure, concise-skill, and renderer-behavior changes
  as `9459890` (`refactor: model provided and required interfaces`).



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
