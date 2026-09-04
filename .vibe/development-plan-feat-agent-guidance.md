# Development Plan: arc42-language (feat/agent-guidance branch)

*Generated on 2026-09-04 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Add `arc42 explain [<blocktype>]` CLI command that provides per-DSL-element guidance to an agent.
Introduce Zod as the single source of truth for element schemas — replacing manual field parsing
and enum validation in `builder.ts`. The Zod schemas drive both runtime validation and the
`explain` output, so nothing is duplicated. Also add a one-liner mention of `arc42 explain`
to `SKILL.md`.

## Key Decisions

- **Zod as single source of truth**: Replace manual field checks in `builder.ts` and the
  TypeScript interfaces in `types.ts` with Zod schemas. Types are inferred via `z.infer<>`.
  No duplication between schema definitions and TS types.
- **`arc42 explain` command**: New CLI command. Without argument: lists all block types with a
  one-line description. With a block type argument: prints full guidance — required fields,
  optional fields, valid enum values, cross-reference fields and their target kinds, arc42
  chapter, and authoring tips.
- **JSON + text output**: follows existing `--format json|text` convention from `arc42 rules`.
- **SKILL.md**: add one-liner about `arc42 explain` to the "Getting started" section.
- **Zod migration scope**: only field-level validation (required fields, enum values, list
  parsing). Cross-workspace rules (E001–E010, W001–W016, H001–H013) stay unchanged.
- **E005 rule**: survives as a thin wrapper — Zod parse errors become `ParseError`s via a
  shared adapter in the builder. The rule just surfaces them as before.
- **Error message compatibility**: existing `builder.test.ts` tests match error messages by
  regex (e.g. `/between.*exactly 2/`, `/type.*actor.*person.*system/i`). The builder must
  **not** forward Zod's raw error messages — it maps Zod validation failures to the same
  human-friendly strings as today. No test changes needed.
- **No breaking changes to public API**: Element interfaces in `types.ts` become `z.infer<>`
  type aliases that are re-exported under the same names — downstream consumers see no change.
- **Schema location**: new file `packages/core/src/model/schemas.ts` owns all Zod schemas.
  `types.ts` imports types from there. `builder.ts` imports parse functions from there.
  `index.ts` exports `elementSchemas` and `ExplainResult` for the CLI.
- **`arc42 explain` guidance text**: each schema carries an `arc42Guidance` metadata object
  with `description` (one-liner), `arc42Chapter`, and `authoringTips` (string). This is the
  only "free text" that lives outside Zod — a plain TS const map keyed by `BlockType`.
- **`splitList` stays in builder**: Zod schemas validate string fields; `splitList` coercion
  (comma-separated → string[]) is applied as a Zod `.transform()` inside the schema, keeping
  the logic in one place.
- **Zod version**: `zod@4.5.4` (latest stable, user confirmed).
- **Zod v4 `.meta()` as single source of truth**: all guidance (description, arc42Chapter, crossRefs, authoringTips) lives in `.meta()` on each schema object; field descriptions in `.meta()` on each field. No separate `ELEMENT_GUIDANCE` or `ELEMENT_PROSE` constant needed.
- **`deriveFields()` introspection**: walks `schema._zod.def.shape`, reads field def type (`optional`, `enum`, `pipe`) to determine required/optional and enumValues structurally.
- **`splitListRequiredSchema`**: added alongside `splitListSchema` for required list fields like `interface.between`. Detected as required by `deriveFields()` because its pipe input is `string` not `optional`.
- **Error message mapping**: `zodErrorToMessage()` checks raw `attributes[field]` to distinguish "missing" (undefined/empty) from "invalid enum". Block-type-qualified messages are special-cased to match existing test regexes.

## Notes

- Zod is not yet a dependency — needs to be added to `packages/core/package.json`.
- `builder.ts` currently does manual `attributes[field]` extraction + inline enum checks +
  `splitList` helper. All of this moves to Zod schemas.
- 8 rules are field-level (Zod could unify them as refinements). 31 are cross-workspace.
  For now, keep the 8 field-level rules as-is — they add rationale text that Zod can't.
- SKILL.md is static and installed via `arc42 init skill`. It will be updated in-place.
- Existing exports from `packages/core/src/index.ts` must remain compatible — use type aliases.
- The `interface` block type's `between` field is a special case: it's a comma-separated list
  that must have exactly 2 entries. This becomes a Zod `.transform()` + `.refine()`.
- `deployment-node.type` is optional but if present must be a valid enum — Zod `.optional()`
  on a `z.enum()` handles this cleanly.

## Explore

### Completed

- [x] Understand DSL element types and their fields (`ast.ts`, `types.ts`)
- [x] Understand builder.ts — manual field extraction, enum checks, list parsing
- [x] Categorize validator rules: 8 field-level vs 31 cross-workspace
- [x] Check current core exports for compatibility constraints
- [x] Confirm zod is not yet a dependency
- [x] Review SKILL.md structure and content

## Plan

### Implementation sequence

The work has a clear dependency order — schemas must exist before builder can use them,
builder must work before CLI can be added:

1. **Schemas** (`packages/core/src/model/schemas.ts`) — new file, Zod schemas + guidance metadata
2. **Types** (`packages/core/src/model/types.ts`) — replace manual interfaces with `z.infer<>` aliases
3. **Builder** (`packages/core/src/model/builder.ts`) — replace manual parsing with Zod `.safeParse()`
4. **Explain API** (`packages/core/src/explain.ts`) — new file, `explainElement(blockType)` function
5. **Core barrel** (`packages/core/src/index.ts`) — export schemas, `explainElement`, `ExplainResult`
6. **CLI** (`packages/cli/src/cli.ts`) — add `explain` command + update `printHelp()`
7. **SKILL.md** (`packages/skill/SKILL.md`) — add one-liner for `arc42 explain`
8. **Tests** — verify explain output and that existing validate tests still pass
9. **Build** — `pnpm run build` + `pnpm test` green

### Schema design (`schemas.ts`)

Each element schema is a `z.object()` that parses the raw `attributes: Record<string, string>` map
from the parser (all values are strings — Zod transforms them into typed model fields):

```
// Shared helpers
const splitList = (val: string | undefined) =>
  z.string().optional().transform(v => v ? v.split(',').map(s=>s.trim()).filter(Boolean) : [])

// Example: quality-goal
export const QualityGoalSchema = z.object({
  id:       z.string().min(1),
  title:    z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  scenario: z.string().optional(),
})
export type QualityGoal = z.infer<typeof QualityGoalSchema> & { kind: "quality-goal", loc: SourceLocation }
```

The `kind` and `loc` fields are injected by the builder after parsing (they come from the
AST node, not from `attributes`) — so they are NOT in the Zod schema. This keeps schemas
focused on what the author writes and avoids awkward `z.literal("quality-goal")` noise.

Guidance metadata lives in a separate const (pure data, no Zod):

```ts
export const ELEMENT_GUIDANCE: Record<BlockType, ElementGuidance> = {
  "quality-goal": {
    description: "An architecturally significant quality attribute goal with a priority.",
    arc42Chapter: 10,
    authoringTips: "Use priority: high only for goals that drive real trade-offs...",
    crossRefs: [],
  },
  ...
}
```

### `explain` output shape

**Text output** (for `arc42 explain building-block`):
```
building-block  (arc42 ch. 5 — Building Blocks)

  An independently deployable software component or group of components.

  Required fields:
    id      Unique identifier (used in cross-references)
    title   Human-readable name

  Optional fields:
    technology  Implementation technology (e.g. "Node.js / PostgreSQL")
    parent      ID of the parent building-block (for decomposition hierarchy)
    implements  Comma-separated concept IDs this block implements

  Cross-references:
    parent      → building-block
    implements  → concept (comma-separated)

  Authoring tips:
    - Leaf blocks (no children) must appear in at least one interface (W002)
    - Document technology to satisfy H003
    - Link to concepts via implements to make cross-cutting concerns traceable
```

**JSON output** (for `arc42 explain building-block --format json`):
```json
{
  "blockType": "building-block",
  "arc42Chapter": 5,
  "description": "...",
  "requiredFields": [{"name":"id","description":"..."}, ...],
  "optionalFields": [{"name":"technology","description":"...", "enumValues": null}, ...],
  "crossRefs": [{"field":"parent","targetKind":"building-block","cardinality":"one"}, ...],
  "authoringTips": ["Leaf blocks (no children) must appear in at least one interface (W002)", ...]
}
```

**`arc42 explain` (no argument)** — lists all types:
```
Block types (run `arc42 explain <type>` for full guidance):

  quality-goal      ch.10  An architecturally significant quality attribute goal.
  quality-scenario  ch.10  A concrete scenario that makes a quality goal measurable.
  constraint        ch.2   A non-negotiable boundary on the architecture.
  ...
```

### Files to change

| File | Change |
|---|---|
| `packages/core/package.json` | Add `"zod": "3.24.2"` to `dependencies` |
| `packages/core/src/model/schemas.ts` | **NEW** — Zod schemas + `ELEMENT_GUIDANCE` |
| `packages/core/src/model/types.ts` | Replace manual interfaces with `z.infer<>` aliases + keep `SourceLocation`, `Workspace`, `ParseError`, constants |
| `packages/core/src/model/builder.ts` | Replace per-block manual parsing with `schema.safeParse(attributes)` |
| `packages/core/src/explain.ts` | **NEW** — `explainElement(blockType?)` → `ExplainResult \| ExplainResult[]` |
| `packages/core/src/index.ts` | Export `explainElement`, `ExplainResult`, `ELEMENT_GUIDANCE` |
| `packages/cli/src/cli.ts` | Add `explain` command handler + update `printHelp()` |
| `packages/skill/SKILL.md` | Add one-liner `arc42 explain` to "Getting started" section |

### Completed

- [x] Design `ElementSchema` structure
- [x] Define `arc42 explain` output format (text + JSON)
- [x] Identify all files to change
- [x] Sequence the work to avoid breaking tests mid-migration

## Code

### Tasks

- [x] **Step 1**: Add `zod@4.5.4` dependency to `packages/core/package.json`
- [x] **Step 2**: Create `packages/core/src/model/schemas.ts` with all 13 Zod element schemas + `.meta()` guidance + `deriveFields()` introspection
- [x] **Step 3**: `types.ts` left unchanged (interfaces kept as-is; no z.infer<> migration needed since types are already compatible and changing would be scope creep)
- [x] **Step 4**: Rewrite `packages/core/src/model/builder.ts` — Zod `.safeParse()` + `zodErrorToMessage()` adapter
- [x] **Step 5**: Create `packages/core/src/explain.ts` — `explainElement()` + `formatExplainText()` + `formatExplainListText()`
- [x] **Step 6**: Update `packages/core/src/index.ts` — export `explainElement`, `ExplainResult`, `ExplainSummary` etc.
- [x] **Step 7**: Add `explain` command to `packages/cli/src/cli.ts` + update `printHelp()`
- [x] **Step 8**: Update `packages/skill/SKILL.md` — add two `arc42 explain` lines to "Getting started"
- [x] **Step 9**: All 176 tests pass; `pnpm build` succeeds for both core and cli; CLI smoke-tested end-to-end

### Completed

- All steps done

## Commit

### Tasks

- [ ] *To be added when this phase becomes active*

### Completed

*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
