# Development Plan: arc42-language (chore/explain-zod-schemas branch)

*Generated on 2026-09-12 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Eliminate redundancy between `schemas.ts` and `types.ts` by deriving TypeScript element types
from Zod schemas via `z.infer<>`. Remove the parallel field definitions, collapse the builder
switch into thin spread+inject cases, and derive `ELEMENT_CHAPTER` / `ELEMENT_KIND_ORDER` from
schema metadata instead of maintaining separate hardcoded maps.

## Key Decisions

- **`kind` and `loc` stay out of schemas.** They come from AST nodes, not parsed attributes.
  Element types become `z.infer<typeof XSchema> & { kind: "x"; loc: SourceLocation }`.
- **Types stay in `types.ts`.** The file is kept but its hand-written interfaces are replaced
  with derived type aliases. `SourceLocation`, `Workspace`, `ParseError`, `DiagramArtifact`, etc.
  remain as-is — they have no schema equivalent.
- **`ELEMENT_CHAPTER` is derived from schema metadata**, not hardcoded. The `arc42Chapter` field
  already exists in every element schema's `.meta()`. `ELEMENT_CHAPTER` becomes a one-liner.
- **`ELEMENT_KIND_ORDER` stays** — it encodes *rendering order* which is distinct from the
  chapter mapping. Chapter comments were restored as orientation hints; the authoritative mapping
  is `ELEMENT_CHAPTER`.
- **`KNOWN_BLOCK_TYPES` in builder.ts is deleted** — replaced with `Object.hasOwn(ELEMENT_SCHEMAS, blockType)`. Using `in` was rejected (review finding P1) because it walks the prototype chain and would allow strings like `"constructor"` to pass the guard, causing a crash. `Object.hasOwn` is the correct replacement.
- **Builder switch cases become a single spread.** `{ ...data, kind: blockType, loc } as Element` is safe because Zod strips unknown keys and `data` never contains `kind` or `loc`.
- **`ELEMENT_SCHEMAS` typed more precisely.** Changed from `Record<BlockType, z.ZodType>` to `as const satisfies Record<BlockType, z.ZodType>` so `z.infer<>` works per-key without casting.
- **`|| undefined` coercions on optional string fields removed** — Zod's `optional()` already produces `undefined` for absent fields after the normalisation step. The coercions were redundant.

## Notes

- `ActorSchema` uses `.superRefine()` after the shape — `z.infer<>` still works, the
  refinement only affects runtime validation, not the inferred type.
- `splitListSchema` transforms `string | undefined → string[]`, so `z.infer<>` already
  produces `string[]` for those fields. The builder's `|| undefined` on list fields is wrong
  today (a list can never be undefined after the schema runs) and will be removed.
- `DeploymentNode.type` is `optional()` in the schema → inferred as
  `"server"|"container"|"device"|"cloud-region"|"environment" | undefined`. Matches the
  current interface exactly.
- Diagram types (`GenericDiagram`, `SequenceDiagram`, etc.) keep their explicit interfaces —
  they carry `kind`, `diagramType`, `source` and `loc` which are not in the diagram schemas.
  Not in scope for this refactor.

## Explore

### Tasks
- [x] Read `schemas.ts` in full
- [x] Read `types.ts` in full
- [x] Read `builder.ts` in full

### Completed
- [x] Created development plan file
- [x] Mapped all consumers of `schemas.ts` (builder.ts, explain.ts)
- [x] Identified three redundancies: field shapes, arc42Chapter map, ELEMENT_KIND_ORDER comments

## Plan

### Tasks
- [x] Write implementation plan (this document)

### Completed
- [x] Plan written

## Code

### Tasks

1. **`schemas.ts`** — Export typed schema map
   - Change `ELEMENT_SCHEMAS` from `Record<BlockType, z.ZodType>` to a typed `const` object
     so callers can do `z.infer<typeof ELEMENT_SCHEMAS["quality-goal"]>` per-key.

2. **`types.ts`** — Replace hand-written interfaces with derived type aliases
   - Import schema types from `schemas.ts`
   - Replace each `export interface Foo { ... }` with:
     `export type Foo = z.infer<typeof FooSchema> & { kind: "foo"; loc: SourceLocation }`
   - Derive `ELEMENT_CHAPTER` from `ELEMENT_SCHEMAS` using schema `.meta()` arc42Chapter values
   - Keep `ELEMENT_KIND_ORDER`, `CHAPTER_TITLE`, `SourceLocation`, `Workspace`, `ParseError`,
     `DiagramArtifact` and all diagram interfaces unchanged

3. **`builder.ts`** — Slim down switch cases
   - Delete `KNOWN_BLOCK_TYPES` set — replace the guard with `Object.hasOwn(ELEMENT_SCHEMAS, blockType)`
   - Replace 13-case switch with single `elements.push({ ...data, kind: blockType, loc } as Element)`
   - Remove `|| undefined` coercions on optional fields (already `undefined` from Zod)

4. **Verify** — Run build + tests to confirm no regressions

### Completed
- [x] `schemas.ts` — `ELEMENT_SCHEMAS` changed to `as const satisfies` for per-key `z.infer<>`
- [x] `types.ts` — all 13 interfaces replaced with `z.infer<> & { kind, loc }` type aliases; `ELEMENT_CHAPTER` derived from schema metadata
- [x] `builder.ts` — `KNOWN_BLOCK_TYPES` removed, switch collapsed to single spread, `|| undefined` coercions dropped
- [x] Review agent finding P1 fixed: `in` operator replaced with `Object.hasOwn`
- [x] `ELEMENT_KIND_ORDER` chapter comments restored (review finding P3)
- [x] Build + 342 tests pass

## Commit

### Tasks
- [ ] Write commit message and commit

### Completed
*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
