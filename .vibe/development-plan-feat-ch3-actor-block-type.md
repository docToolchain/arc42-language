# Development Plan: arc42-language (feat/ch3-actor-block-type branch)

_Generated on 2026-09-01 by Kiro_
_Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)_
_Closes: GitHub issue #3_

## Goal

Add the `actor` block type to cover arc42 chapter 3 (System Scope and Context). Actors are the external parties — people, organisations, or external systems — that interact with the system under description. Modelling them as typed DSL elements enables cross-referencing from `interface.between` and unlocks context-level validation rules.

## Key Decisions

### New block type: `actor` (chapter 3)

| Field         | Required | Type   | Values                  |
| ------------- | -------- | ------ | ----------------------- |
| `id`          | yes      | string | unique across workspace |
| `title`       | yes      | string | free text               |
| `type`        | no       | enum   | `person` \| `system`    |
| `description` | no       | string | free text               |

`type` distinguishes human roles (`person`) from external software systems (`system`). `external-system` was dropped as redundant — all actors in chapter 3 are external by definition. It is optional to keep the block writable without forcing an early classification decision.

### Relax E004 to allow actor↔building-block interfaces

Current E004 fires when either end of `interface.between` is not a `building-block`. After this change, E004 must allow one end to be an `actor` — the other must remain a `building-block`. An interface between two actors (actor↔actor) is still an error: it would model an external interaction the system does not participate in.

Updated E004 logic:

- If both ends are non-building-block → error (existing behaviour, covers actor↔actor too)
- If one end is an actor AND the other is a building-block → valid
- If one end is an actor AND the other is not a building-block → error

### New validation rules

| Code | Severity | Description                                    | Check logic                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H008 | hint     | Actor not connected to any interface           | For each `actor`: check `index.refsTo.get(el.id)` — if no referencing element is an `interface` → hint. Message: "Actor '...' is not connected to any interface — document how external parties interact with the system (chapter 3)".                                                                                                                                                                                                                               |
| W010 | warning  | Interface connects two non-building-block ends | For each `interface` where neither end is a `building-block` → warning. (This covers actor↔actor and similar.) Message: "Interface '...' has no building-block on either side — an interface must connect an actor to a building-block (chapter 3/5)". Note: this overlaps with E004 in some cases; after relaxing E004, W010 becomes the catch for the actor↔actor case that E004 no longer covers via the old path. Re-evaluate if E004 already covers this fully. |

Rule numbering: next available H = H008, next available W = W010.

### Resolver update

The resolver already indexes `interface.between` refs generically via `addRef`. No change needed — once `actor` IDs exist in `byId`, E002 will validate them and H008 can query `refsTo`.

### Starter template

New file `templates/starter/03-system-context.arc42.md` covering chapter 3. Design principles mirror existing templates: one `##` section per actor, HTML comment guidance at the top, placeholder IDs using `actor-` prefix, at least one example interface connecting an actor to a building-block defined in `05-building-blocks.arc42.md`.

The template should validate clean when combined with the full starter set (0 errors, 0 warnings). Standing alone it will produce H008 (actor with no interface, because the building-block is in a different file) — this is acceptable and mirrors the existing cross-file hint behaviour.

### SKILL.md update

Add `actor` row to the block type reference table and update the cross-reference guide to document that `interface.between` now accepts `actor` IDs on one side.

### Implementation order

1. `ast.ts` — add `"actor"` to `BlockType` union
2. `model/types.ts` — add `Actor` interface, update `ELEMENT_KIND_ORDER`, `ELEMENT_CHAPTER`, `CHAPTER_TITLE`
3. `model/builder.ts` — add `"actor"` to `KNOWN_BLOCK_TYPES`, add parsing branch
4. `resolver/index.ts` — no change needed (generic ref indexing already covers actors)
5. `renderer/text.ts` — add `renderActor` and cases in switch statements
6. `validator/rules/e004-interface-between-non-block.ts` — relax to allow actor↔building-block
7. `validator/rules/h008-actor-no-interface.ts` — new rule
8. `validator/rules/w010-interface-no-building-block.ts` — new rule (evaluate if E004 already covers this after the E004 relaxation)
9. `validator/rules/index.ts` — register H008 and W010
10. `templates/starter/03-system-context.arc42.md` — new starter template
11. `packages/skill/SKILL.md` — update block type table and cross-reference guide

### Edge cases

- **Actor on both sides of interface**: E004 (relaxed) still fires — actor↔actor is not a valid interface in the DSL.
- **Actor with no interface**: H008 fires as a hint (not an error) — an actor defined but not yet connected is a stub, not a structural break.
- **W010 vs E004 overlap**: after E004 is relaxed, re-check whether W010 adds value or duplicates. Keep W010 if E004's updated message doesn't clearly cover the actor↔actor case.
- **CLI `BLOCK_TYPES` and chapter filter**: must add `"actor"` to the CLI's known block type list and add chapter 3 to the `--chapter` filter for `arc42 rules`.
- **`CHAPTER_TITLE`**: add entry `3 → "System Scope and Context"`.

---

## Explore

### Tasks

- [x] Read GitHub issue #3 for full requirements
- [x] Read existing model, builder, resolver, validator, and renderer source files
- [x] Read existing development plan to understand conventions
- [x] Understand E004 current logic and how to relax it
- [x] Identify rule numbering gap (H008, W010)
- [x] Document findings in plan file

## Plan

### Tasks

- [x] Define `actor` block shape and field spec
- [x] Define E004 relaxation logic
- [x] Define H008 and W010 check logic
- [x] Confirm resolver needs no change
- [x] Identify CLI changes needed (block type list, chapter filter)
- [x] Define starter template design
- [x] Document implementation order and edge cases

## Code

### Tasks

**Step 1 — DSL model extension**

- [x] `packages/core/src/ast.ts`: add `"actor"` to `BlockType` union
- [x] `packages/core/src/model/types.ts`:
  - Add `Actor` interface (`id`, `title`, `type?`, `description?`, `loc`)
  - Add `actor` to `Element` union
  - Add `"actor"` to `ELEMENT_KIND_ORDER` (after `"constraint"`, chapter 3)
  - Add `"actor"` to `ELEMENT_CHAPTER` (→ 3)
  - Add `3 → "System Scope and Context"` to `CHAPTER_TITLE`
- [x] `packages/core/src/model/builder.ts`:
  - Add `"actor"` to `KNOWN_BLOCK_TYPES`
  - Add parsing branch for `actor` (validate optional `type` enum: `person | system`)

**Step 2 — Renderer**

- [x] `packages/core/src/renderer/text.ts`:
  - Add `renderActor` method
  - Add `actor` cases in `renderElementLine` and `renderElement` switch statements

**Step 3 — Validation rules**

- [x] `packages/core/src/validator/rules/e004-interface-between-non-block.ts`: relaxed to allow one actor end + one building-block end; errors on actor↔actor and other invalid types
- [x] `packages/core/src/validator/rules/h008-actor-no-interface.ts`: new hint rule
- [x] W010 evaluation: E004 already covers actor↔actor as an error — W010 not needed

**Step 4 — Rule registry**

- [x] `packages/core/src/validator/rules/index.ts`: imported and registered H008

**Step 5 — CLI update**

- [x] `packages/cli/src/cli.ts`: added `"actor"` to `BLOCK_TYPES`, added chapter 3 to `CHAPTER_NAMES`, updated help text

**Step 6 — Starter template**

- [x] `templates/starter/03-system-context.arc42.md`: template with 2 actor + 2 interface examples and guidance comments

**Step 6b — Project doc (eat our own dog food)**

- [x] `docs/arc42/03-system-context.arc42.md`: actual chapter 3 for arc42-language with actors (Architect, AI Agent, CI Pipeline) and interfaces to bb-cli / bb-skill

**Step 7 — SKILL.md**

- [x] `packages/skill/SKILL.md`: added `actor` row to block type table, added `actor.type` enum constraint, updated `between` cross-reference note, updated chapter filter hint

**Step 8 — Build & verify**

- [x] `pnpm --filter @arc42/core run build` → success
- [x] `pnpm --filter @arc42/cli run build` → success
- [x] `pnpm --filter @arc42/core run test` → 79 tests pass (4 new tests for E004 relaxation and H008)
- [x] `arc42 validate --dir examples/bookstore-backend` → 0 errors (no regression)
- [x] `arc42 validate --dir templates/starter` → 0 errors, 0 warnings, 0 hints
- [x] `arc42 validate --dir docs/arc42` → 0 errors, 0 warnings, 0 hints

## Commit

### Tasks

- [ ] Stage and commit all changes on `feat/ch3-actor-block-type`
- [ ] Close GitHub issue #3

### Completed

_None yet_

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
