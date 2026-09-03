# Development Plan: arc42-language (feat/implement-issue-4 branch)

_Generated on 2026-09-01 by Vibe Feature MCP_
_Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)_

## Goal

Add one first-class, architecture-level `solution-strategy` element for arc42 chapter 4, including
model/query/rendering support, a starter template, and H009/H010 traceability hints between the
solution strategy and quality goals.

## Key Decisions

- `solution-strategy` represents the single solution strategy for the whole architecture. It has
  required `id` and `title`, plus optional comma-separated `addresses` (quality-goal ids). It does
  not have a `details` attribute: the chapter's Markdown prose and subsections are the content.
- The block is placed once below the chapter-4 `# Solution Strategy` heading. Subheadings such as
  `## Focused Package Boundaries` remain prose and do not each receive a DSL block.
- `addresses` will be represented as `string[]`, matching the existing `decision.addresses` model,
  and indexed as outgoing references so unresolved quality-goal ids continue to produce E002.
- H009 checks the singleton strategy for an empty `addresses` list. H010 checks each quality goal
  for at least one incoming reference from that `solution-strategy`; links from decisions do not
  satisfy H010.
- The workspace must contain at most one `solution-strategy` element. Duplicate blocks should be
  reported as a structural validation error rather than silently merged or dropped.
- Chapter 4 must be added to the canonical chapter/type metadata and rule chapter union. The
  existing parser already preserves raw block types, so no parser algorithm change is expected.
- The starter file will keep its example inside an HTML comment, like the other starter templates,
  so copying the untouched template contributes no elements or diagnostics.
- No separate architecture or design document exists under `.vibe/docs`; the small extension will
  follow the existing parser → builder → resolver → validator/renderer pipeline rather than add a
  new abstraction or registry mechanism.
- The public model will expose `SolutionStrategy` through the core barrel exports and include it in
  `Element`, so consumers using `getElements` receive the same typed element shape as all existing
  block kinds.
- For text rendering, optional `addresses` are omitted when empty. Chapter prose is intentionally
  not copied into the element view; this preserves the separation between Markdown document
  content and the typed architecture graph.
- H009/H010 remain `hint`/`suggestion` rules and therefore never change `ValidateResult.valid`; only
  malformed blocks and unresolved references remain errors under the existing parser/validator
  behavior.
- The implementation inherits the earlier language-design decisions: Markdown prose remains the
  primary architecture narrative, structured blocks contain only machine-readable metadata, the
  parser stays line-oriented and open-ended, references are ID-based, and the rule registry is the
  single validation integration point.
- The rules/template work inherits the previous extension plans' conventions: new diagnostics use
  the next stable codes (E007, H009, H010), chapter ordering is centralized in model metadata, JSON
  rendering remains generic, and starter examples stay inside HTML comments.
- The chapter-4 singleton is an explicit, narrow exception to the previous general authoring rule
  of one heading → one prose section → one block. It does not invalidate that rule for chapters 1,
  2, 3, 5, 8, 9, 11, or 12.

## Notes

- Issue #4 is titled `feat(ch4): add solution-strategy block type` and requires clean validation for
  workspaces containing the new singleton block, H009 for an unlinked strategy, H010 for an
  uncovered quality goal, and a clean starter template.
- Existing element ordering is centralized in `packages/core/src/model/types.ts`; chapter 4 belongs
  after actors/chapter 3 and before building blocks/chapter 5.
- Existing reference indexing is centralized in `packages/core/src/resolver/index.ts`; decisions
  currently use `addresses`, so solution strategies should follow the same `addRef` pattern.
- Text rendering uses exhaustive `Element` switches in `packages/core/src/renderer/text.ts`; JSON
  rendering serializes the element generically and needs no type-specific branch.
- The CLI duplicates block-type and chapter-name lists in `packages/cli/src/cli.ts`, so both lists
  must include `solution-strategy` and chapter 4.
- `docs/arc42/04-solution-strategy.arc42.md` is the project's live DSL example. It contains one
  top-level strategy block linked to the five existing quality goals; its existing subsection
  headings remain prose and do not receive blocks.

## Explore

### Tasks

- [x] Read issue #4 acceptance criteria and inspect repository/workflow state
- [x] Trace block parsing, workspace building, reference indexing, rendering, and CLI type filters
- [x] Inspect validator metadata/registry and identify available rule numbers H009/H010
- [x] Inspect starter templates, project skill guidance, chapter-4 docs, and relevant unit tests
- [x] Identify affected implementation files and test coverage needed for the new block and hints

### Completed

- [x] Created development plan file
- [x] Confirmed parser is intentionally open-ended; builder owns known block type rejection
- [x] Confirmed validation validity is error-only, so H009/H010 hints do not make a workspace invalid
- [x] Confirmed cross-reference resolution is bidirectional and supports generic unresolved-reference E002

### Findings

| Area             | Finding                                                                                                                       | Implication                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AST/parser       | `BlockNode.blockType` is raw `string`; `BlockType` is the public union.                                                       | Add the new literal to `ast.ts`; parser code itself should not change.                                                                                                                        |
| Model/builder    | `KNOWN_BLOCK_TYPES` and the builder's block dispatch define accepted elements and required fields.                            | Add `SolutionStrategy`, register the type, parse `addresses` with `splitList`, and enforce singleton cardinality at workspace validation.                                                     |
| Chapter metadata | `ELEMENT_KIND_ORDER`, `ELEMENT_CHAPTER`, `CHAPTER_TITLE` drive sorting and text grouping.                                     | Add chapter 4 metadata and place the new kind between actor and building-block.                                                                                                               |
| Resolver/API     | References are added per element kind; workspace edges are built separately in `arc42.ts`.                                    | Index strategy addresses and expose `addresses` edges in workspace `get` output.                                                                                                              |
| Rendering        | Text renderer has type-specific workspace/detail switches; JSON renderer serializes elements generically.                     | Add text output for `addresses` and `details`; JSON should work automatically once the model is typed.                                                                                        |
| Validation       | Rules are self-describing objects registered in `builtinRules`; H001/H002 are analogous address/coverage hints for decisions. | Implement/register singleton cardinality validation plus `h009-solution-strategy-no-addresses.ts` and `h010-quality-goal-unaddressed-by-strategy.ts`, with chapter 4/1 metadata respectively. |
| CLI              | `BLOCK_TYPES`, `CHAPTER_NAMES`, and help chapter filter text are maintained locally.                                          | Add the new type and chapter 4 to all three CLI references.                                                                                                                                   |
| Documentation    | `SKILL.md` has block and cross-reference tables; starter templates are comment-only examples.                                 | Document that chapter 4 has one block at the chapter level, keep subsection content as prose, and add `templates/starter/04-solution-strategy.arc42.md`.                                      |
| Tests            | Builder, validator, renderer, and workspace integration tests already cover analogous types/rules.                            | Add focused builder/cardinality/H009/H010/reference/rendering tests and validate the starter template/workspace behavior.                                                                     |

## Plan

### Tasks

- [x] Resolve the chapter-vs-heading modeling issue: use one architecture-level block below the
      chapter heading, with all subsection explanations remaining Markdown prose
- [x] Define the new block contract: required `id`/`title`, optional `addresses` list, and no
      `details` field because prose is the canonical content representation
- [x] Define singleton cardinality: at most one solution-strategy element per workspace
- [x] Choose the existing pipeline extension points instead of introducing a chapter-specific
      parser or generalized relation abstraction
- [x] Define H009 as singleton-strategy-without-addresses and H010 as quality-goal-without-strategy,
      including exact source element kinds and diagnostic wording pattern
- [x] Define canonical ordering and chapter metadata: strategy is chapter 4, after actors and
      before building blocks
- [x] Define implementation order and dependency boundaries for the Code phase
- [x] Define test matrix, documentation updates, and validation commands
- [x] Decide that the existing chapter-4 document should be a live DSL example with one production
      strategy block; keep the new starter template comment-only and keep subsection content as prose

### Completed

- [x] Plan is complete; all architecture/design decisions and implementation dependencies are
      recorded above and below.
- [x] Reconciled this plan with the earlier language-design, rules/template, and chapter-3 plans;
      retained their shared pipeline, registry, severity, template, and authoring conventions.

### Implementation Strategy

1. **Model contract and construction**
   - Extend `BlockType`, `Element`, the public core exports, element-kind ordering, chapter mapping,
     and chapter title mapping.
   - Add a `SolutionStrategy` interface with `id`, `title`, `addresses`, and source location fields
     consistent with the other elements. Do not add a details/content field; the Markdown AST owns
     prose and the graph model owns only typed architecture facts.
   - Register the block in the builder's known-type set and dispatch. Enforce existing required
     field behavior for `id` and `title`; parse comma-separated addresses with the shared list
     helper.
   - Preserve all parsed blocks long enough for workspace validation, then report a structural
     diagnostic when more than one solution-strategy block exists. Never merge their addresses or
     silently choose the first/last block.
2. **References and query output**
   - Add strategy `addresses` to `buildIndex`, yielding `refsFrom`/`refsTo` entries and E002 for
     unknown target ids through existing validation.
   - Add strategy address edges to `getElements` workspace output using the existing `addresses`
     relation, without changing edge typing or filtering semantics.
3. **Validation**
   - Implement H009 and H010 as independent rules with metadata, register them in the built-in rule
     list and code map, and keep their checks based on `ReferenceIndex` rather than raw AST nodes.
   - H009 emits one hint only for a valid singleton strategy when it has no addresses; if duplicate
     strategy blocks exist, E007 is the sole strategy-cardinality diagnostic and H009 is suppressed.
     H010 emits one hint
     per quality goal whose incoming references contain no `solution-strategy`; a decision addressing
     the same goal does not suppress H010.
4. **Rendering and CLI**
   - Add the chapter-4 strategy case to the text renderer's workspace and element-detail output,
     rendering only typed fields such as id, title, and addresses. The renderer must not pretend
     that subsection prose is part of the element payload.
   - Add the block type and chapter 4 to CLI metadata/help/filter handling. Keep JSON generic unless
     compilation or tests demonstrate a type-specific requirement.
5. **Authoring support**
   - Add a commented chapter-4 starter template with one block directly under the chapter heading,
     followed by several prose subsections and an example `addresses` list.
   - Update the skill/reference documentation's block inventory, chapter mapping, singleton rule,
     and traceability guidance. Make the existing project chapter-4 document a live DSL example with
     one active strategy block linked to the quality goals.
6. **Verification and cleanup**
   - Add focused unit tests before or alongside implementation for builder parsing, invalid required
     fields, reference indexing/edges, H009/H010 semantics, ordering, text/JSON output, CLI metadata,
     and comment-only starter parsing.
   - Run the repository's targeted core/CLI tests, typecheck/lint/build commands available in the
     package scripts, and a workspace validation smoke test. Fix regressions before phase transition.

### Design Options Considered

- **Store all strategy content as a single large block attribute:** rejected because it duplicates
  Markdown prose, makes subsection structure less readable, and breaks the existing separation
  between document content and typed graph facts.
- **Use one block per subsection heading:** rejected because arc42 chapter 4 describes one coherent
  architecture-wide strategy; multiple blocks would imply independent strategies and make the
  chapter's optional many-goal traceability look like multiple strategy entities.
- **Store the strategy only as Markdown prose:** rejected because the architecture-wide strategy
  needs a typed identity and typed links to quality goals for queries and H009/H010.
- **Reuse `Decision` for chapter 4:** rejected because chapter 4 solution strategy and chapter 9
  decisions have different semantics and must be distinguishable for H010 and chapter rendering.
- **Introduce a generic relation field shared by decisions and strategies:** rejected as unnecessary
  scope; the established `addresses: string[]` convention gives the required behavior with less API
  churn.
- **Make `addresses` required:** rejected because H009 is specifically useful as a hint for an
  intentionally incomplete strategy, and the strategy may legitimately not trace to a quality goal.
- **Add active examples to the repository's chapter-4 document:** accepted for this feature; the
  project documentation is intentionally a live example and validates cleanly with the new block.

### Dependencies and Edge Cases

- `BlockType` and `Element` must be updated together or builder/typecheck failures will occur.
- An empty or whitespace-only `addresses` attribute must become `[]`, not `['']`; duplicate ids may
  remain duplicates because existing list parsing does not normalize relation lists.
- A workspace with zero strategy blocks is allowed at the model layer so existing documents remain
  parseable; H009 applies only when the singleton exists. If the issue requires chapter 4 presence,
  that should be a separate chapter-completeness rule rather than conflated with H009.
- A workspace with two strategy blocks must produce a deterministic structural error at both block
  locations or at least the second location; it must not produce independent H009 hints as if they
  were valid strategies.
- Missing target ids must still be indexed and reported by existing unresolved-reference validation;
  H010 must not treat an unresolved strategy link as coverage unless the existing index semantics
  explicitly define it as a reference to a known quality goal.
- A quality goal addressed by both a decision and a strategy is covered for H010; a quality goal
  addressed only by a decision still receives H010.
- There can be at most one strategy, so H009 is emitted at most once; multiple uncovered quality
  goals still produce independent H010 diagnostics.
- The strategy kind must have a stable order in workspace queries and chapter 4 must render between
  chapter 3 and chapter 5 output.
- The starter template is documentation-only and is not part of the automated validation/test
  fixture set; its commented example follows the established template convention.

### Planned Validation Matrix

| Area               | Cases                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder            | valid singleton strategy; missing id; missing title; empty addresses; multiple addresses; duplicate strategy blocks                                   |
| Resolver/API       | known address resolves both directions; unknown address yields E002; workspace address edge                                                           |
| Rules              | H009 with/without address; H010 with strategy coverage, decision-only coverage, and no coverage; duplicate cardinality error without H009 duplication |
| Ordering/rendering | chapter-4 title/order; text typed-field output without synthetic prose; JSON element serialization                                                    |
| CLI/docs           | block/chapter metadata and help/filter acceptance; one block per chapter heading guidance                                                             |
| Regression         | existing core validator, renderer, parser, CLI, and workspace tests remain green                                                                      |

## Code

### Tasks

- [x] Implement model, builder, resolver, validator, renderer, CLI, docs, and starter-template changes
- [x] Add/update focused tests from the planned validation matrix, excluding starter-template
      validation as requested; the template remains documentation-only
- [x] Run targeted and full available validation; resolve feature-related failures

### Completed

- [x] Incorporated the previous implementation plans' shared architectural and authoring decisions
      into this feature's implementation record.
- [x] Implemented the initial singleton solution-strategy integration and registered E007/H009/H010.
- [x] Removed the starter-template parser test; starter files are authoring guidance rather than
      test fixtures.
- [x] Added focused tests for strategy parsing, required fields, references, unresolved addresses,
      singleton/H009 behavior, H010 semantics, chapter ordering/address edges, and text rendering.
- [x] Validation completed: `pnpm test` passes with 92 tests; `pnpm build` succeeds; changed-file
      lint and formatting checks pass; `docs/arc42` and `examples/bookstore-backend` validate cleanly;
      `arc42 rules --chapter 4 --format json` exposes E007 and H009.
- [x] Package builds for `@arc42/core` and `@arc42/cli` succeed.
- [x] Package-wide `pnpm --filter @arc42/core run check` and the CLI equivalent still report
      formatting failures in pre-existing untouched files (including package metadata and existing
      parser/renderer/rule files). This is recorded as a repository baseline issue, not a
      feature-related type, lint, test, or build failure; changed-file checks pass.
- [x] Updated the project's own `docs/arc42/04-solution-strategy.arc42.md` with one live
      architecture-level strategy block, links to all five existing quality goals, and prose that
      explains the package boundaries, human-readable DSL, validation pipeline, and agent workflow.

## Commit

### Tasks

- [x] Review changed implementation and documentation for debug output, TODO/FIXME markers,
      commented-out development code, and stale feature-progress wording
- [x] Reconcile the final project chapter-4 documentation with the implemented singleton strategy
      and quality-goal references
- [x] Run final tests, builds, documentation validation, formatting, and diff checks
- [x] Create the delivery commit and pull request, if repository access and workflow require it

### Completed

- [x] Cleanup scan found no development-only debug output or TODO/FIXME markers. CLI console calls
      are intentional user-facing output and error reporting.
- [x] Documentation review completed; no standalone `.vibe/docs` requirements, architecture, or
      design document exists, so final architectural decisions remain recorded here.
- [x] Final validation passed: 92 tests, core/CLI build, clean `docs/arc42` and
      `examples/bookstore-backend` validation, Markdown formatting, and `git diff --check`.

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
