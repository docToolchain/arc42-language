# Development Plan: arc42-language (feat/building-block-and-context-diagrams branch)

*Generated on 2026-09-07 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Implement two new diagram types for the arc42-language tool:

1. **Building Block Diagram** (Issue #40, arc42 chapter 5): `:::diagram view: building-block` — generates a Mermaid flowchart from the model's building blocks and interfaces. Must appear as the first element in ch5, warn if missing, support multiple diagrams (all before the first sub-heading), support optional `roots` scoping. Hint rules for incomplete hierarchy and missing interfaces.

2. **System Context Diagram** (Issue #41, arc42 chapter 3): `:::diagram view: context` — generates a Mermaid flowchart from the model's actors and external interfaces. Typically fully visualized, may be split into multiple diagrams, must appear as the first element in ch3, warn if missing.

---

## Key Decisions

1. **New diagram types follow the existing `:::diagram` pattern**: Both new diagram types use new `diagramType` values (`"building-block"` and `"context"`), extending `DiagramArtifact` and AST `DiagramNode`. The parser already handles `:::diagram` blocks generically — the builder and parser's `createDiagramNode` just need new `view` discriminants.

2. **Diagrams are authored (not generated)**: Like all other diagram types, building-block and context diagrams require an author-written (or agent-written) `\`\`\`mermaid` fenced block following the `:::diagram` metadata. The Mermaid source is the ground truth. There is no auto-generation from the model — the source is stored as-is, just like deployment and sequence diagrams. The validator rules (H015, H016) check that the authored source is consistent with the model.

3. **No generator code, no two-pass build**: Decisions 3, 4, 5, and 8 from the original plan are superseded. No `packages/core/src/diagrams/` folder. The builder handles building-block and context nodes exactly like deployment nodes: extract metadata, store source verbatim.

4. **Parser: `createDiagramNode` handles new `view` values, fenced source is required**: When `metadata.view === "building-block"` or `"context"`, the parser creates a `BuildingBlockDiagramNode` / `ContextDiagramNode` with the fenced Mermaid as `source`. If no fence follows, `source` is `""` (same fallback as other types).

5. **E008 skips new diagram types for notation validation but participates in duplicate-id detection**: `e008-diagram-validation.ts` was updated so that ALL diagram types (including `building-block` and `context`) participate in duplicate-id detection first, then the type-specific skips happen. This ensures duplicate ids across any diagram type combination are caught.

6. **Validation rules follow existing rule pattern. New rule codes**:
   - `W019` — `w019-missing-building-block-diagram.ts`: chapter 5 file has no building-block diagram
   - `W020` — `w020-missing-context-diagram.ts`: chapter 3 file has no context diagram
   - `H015` — `h015-building-block-diagram-incomplete-hierarchy.ts`: a building block id is absent from all diagram sources in the file (union coverage)
   - `H016` — `h016-building-block-diagram-missing-interfaces.ts`: an interface id, both of whose endpoint block ids appear in the union source, is itself absent from the union source (union coverage)

7. **DSL for new diagram types**:
   - Building block: `view: building-block`, `notation: mermaid` (optional), optional `roots: bb-id1, bb-id2`; followed by a `\`\`\`mermaid` block with Mermaid `graph TD` source
   - Context: `view: context`, `notation: mermaid` (optional), optional `roots`; followed by a `\`\`\`mermaid` block
   - `id` is required (enforced via Zod schema).

8. **H015/H016 use union coverage via substring match on source**: Both rules check whether a block id (H015) or interface id (H016) appears as a substring in the concatenated sources of all building-block diagrams in the chapter 5 file. This is intentionally simple and low-noise (hint severity). False positives from partial id matches are unlikely in practice given arc42 id conventions.

9. **Multiple diagrams covering one purpose use union coverage for hints**: A chapter may contain multiple `view: building-block` diagrams. H015/H016 evaluate coverage across the *union* of all building-block diagram sources in a file — a hint fires only if some block or interface is absent from *all* of them combined.

10. **Web package types mirror (`packages/web/src/types.ts`) kept in sync with core**: `BuildingBlockDiagramNode`, `ContextDiagramNode` added to AST union; `BuildingBlockDiagram`, `ContextDiagram` added to `DiagramArtifact`. All include `view` fields matching core (e.g. `view: "building-block"`), consistent with the deployment diagram pattern.

11. **Web rendering: all diagram types get dedicated view components for consistency**: Rather than adding view components only for new types, all five diagram types get components. This avoids an inconsistent pattern where some types dispatch through a component and others go directly to `MermaidDiagram`. Components:
   - `GenericDiagramView.tsx` — fallback for `diagramType: "generic"`, wraps `MermaidDiagram`
   - `SequenceDiagramView.tsx` — for `diagramType: "sequence"`, wraps `MermaidDiagram`; can show linked scenario in future
   - `DeploymentDiagramView.tsx` — for `diagramType: "deployment"`, wraps `MermaidDiagram`; can show roots scope in future
   - `BuildingBlockDiagramView.tsx` — new, for `diagramType: "building-block"`
   - `ContextDiagramView.tsx` — new, for `diagramType: "context"`
   
   `MermaidDiagram.tsx` stays as the shared rendering primitive — unchanged. `AstNodeRenderer.tsx` `case "diagram"` dispatches on `diagramNode.diagramType` to the appropriate component. Duplicate `reconstructBlockSource`/`reconstructArc42FenceSource` functions collapsed into one.

12. **Diagram metadata validated via `DIAGRAM_SCHEMAS` (Zod)**: All diagram types use a `DIAGRAM_SCHEMAS` map in `schemas.ts` for metadata validation, mirroring the `ELEMENT_SCHEMAS` pattern for element blocks. This is DRY — the builder looks up the schema by `diagramType`, validates, then constructs the artifact. `id` is `required` via `.min(1)`, making missing-id a parse error (E005) rather than a deferred E010 issue. Previously, deployment diagrams with missing ids were passed through to E010; now they fail at build time like all other broken artifacts.

13. **Example files updated**: `03-context.arc42.md` and `05-building-blocks.arc42.md` each have a `:::diagram` block with a complete `\`\`\`mermaid` source block at the top of the chapter.

---

## Notes

### Codebase Architecture Summary

**Package layout:**
- `packages/core` — parser, builder, model types, validator rules, renderers; pure Node.js
- `packages/web` — React SPA served by `arc42 serve`; receives `WorkspacePayload` via HTTP
- `packages/cli` — CLI commands; calls core API
- `packages/skill` — agent skill (SKILL.md generation)

**Key pipeline:**
```
.arc42.md files → parseMarkdown() → DocumentAst[]
  → buildWorkspace() → Workspace (elements + diagrams + docs)
  → buildIndex() → ReferenceIndex
  → validate() → Diagnostic[]
  → loadWorkspace() → WorkspacePayload (served to SPA)
```

**Existing diagram type handling:**
- Parser (`markdown-parser.ts`): `:::diagram ... :::` → `DiagramMetadata` → `DiagramNode` (generic/sequence/deployment)
- Builder (`builder.ts`): maps `DiagramNode` to `DiagramArtifact` (model object) in `Workspace.diagrams`
- Web (`AstNodeRenderer.tsx`): `case "diagram"` → `<MermaidDiagram source={diagramNode.source} id={...} />`
- Validation (`e008`, `e010`): diagram-specific validation rules

**Existing diagram types for reference:**
| `view` attribute | `diagramType` | Chapter | Source |
|---|---|---|---|
| `"deployment"` | `"deployment"` | 7 | Author-written Mermaid |
| *(none)* + `notation: "mermaid-sequence"` | `"sequence"` | 6 | Author-written Mermaid |
| *(none)* + other notation | `"generic"` | any | Author-written Mermaid |

**New types to add:**
| `view` attribute | `diagramType` | Chapter | Source |
|---|---|---|---|
| `"building-block"` | `"building-block"` | 5 | Generated from model |
| `"context"` | `"context"` | 3 | Generated from model |

**Builder two-pass pattern detail:**
The builder currently collects `diagrams: DiagramArtifact[]` inline. For generated diagrams, a second collection `pendingGeneratedDiagrams` holds diagram nodes whose source needs to be computed after all elements are known. After the main loop completes, elements are computed then generated diagrams are resolved and pushed to `diagrams`.

**Rule detection strategy for W019/W020:**
- Detect the chapter 5/3 file using the same filename pattern as W015 (`NN-*.arc42.md`)
- Scan `workspace.documents` for the relevant file
- Check if `workspace.diagrams` contains any diagram with the right `diagramType` and whose `loc.file` matches the chapter file
- Emit warning if none found

**Rule detection strategy for H015/H016 (union coverage):**
- Both rules evaluate coverage across the *union* of all building-block diagrams in a given chapter 5 file, not per-diagram. This respects the multi-diagram pattern where an author deliberately splits the view.
- H015: Collect all building blocks that appear in *any* `building-block` diagram in the chapter 5 file (by computing the visualized set for each diagram and taking their union). Emit a hint for each workspace building block absent from the union. File the hint on the *first* building-block diagram in the chapter 5 file (line of that diagram node).
- H016: Collect all interfaces whose both `between` endpoints are in the union of visualized building blocks (from H015 union set). Emit a hint for each such interface that is absent from *all* diagrams' generated sources. File the hint on the first building-block diagram node.

**Mermaid generation detail — building-block diagram:**
```
graph TD
  bb-api-gateway["API Gateway\n(nginx)"]
  bb-catalog-service["Catalog Service\n(Node.js)"]
  ...
  if-gateway-catalog["Gateway → Catalog"] --> bb-api-gateway & bb-catalog-service
  ...
  click bb-api-gateway "/element/bb-api-gateway" "View element"
```
Actually simpler: nodes are building blocks, edges represent interfaces directly:
```
graph TD
  bb-api-gateway["API Gateway\n(nginx)"]
  bb-catalog-service["Catalog Service"]
  bb-api-gateway -- "Gateway → Catalog\n(HTTP/JSON)" --> bb-catalog-service
  click bb-api-gateway "#bb-api-gateway"
```

**Mermaid generation detail — context diagram:**
```
graph TD
  actor-customer(["Customer\nperson"])
  bb-api-gateway["API Gateway"]
  actor-customer -- "Customer → API Gateway\n(HTTPS/REST)" --> bb-api-gateway
```
Actors are shown as stadium shapes `([...])` for persons, and rectangles for external systems. Building blocks that appear as interface endpoints are shown as boxes. Only external-facing interfaces (those with an actor on one side) appear here.

---

## Explore
### Tasks
- [x] Read development plan file
- [x] Explore package structure and core pipeline
- [x] Understand existing diagram type handling (parser, builder, model, web renderer)
- [x] Read existing diagram validation rules (E008, E010, H004) for patterns
- [x] Read example files to understand DSL syntax and chapter structure
- [x] Understand validator rule registration and naming conventions
- [x] Identify what model data is available for diagram generation (BuildingBlock, Interface, Actor)
- [x] Check Mermaid rendering in web (MermaidDiagram.tsx) for compatibility
- [x] Document all findings and key decisions

### Completed
- [x] Created development plan file
- [x] Full codebase exploration completed

---

## Plan
### Tasks
- [x] Design new AST types (`BuildingBlockDiagramNode`, `ContextDiagramNode`)
- [x] Define DSL syntax — authored Mermaid source required, same as deployment diagrams
- [x] Define new rule codes (W019, W020, H015, H016) and their detection strategy
- [x] Plan web type sync changes and dedicated view components (BuildingBlockDiagramView, ContextDiagramView)
- [x] Plan example file updates
- [x] Create ordered Code phase task list

### Completed
- [x] All planning tasks complete

---

## Code
### Tasks

#### Step 1: AST types — `packages/core/src/ast.ts`
- [x] Add `BuildingBlockDiagramNode` interface extending `DiagramNodeBase` with `diagramType: "building-block"`, `view: "building-block"`, `roots: string[]`
- [x] Add `ContextDiagramNode` interface extending `DiagramNodeBase` with `diagramType: "context"`, `view: "context"`, `roots: string[]`
- [x] Add both to the `DiagramNode` union

#### Step 2: Model types — `packages/core/src/model/types.ts`
- [x] Add `BuildingBlockDiagram` with `diagramType: "building-block"`, `view: "building-block"`, `roots: string[]`
- [x] Add `ContextDiagram` with `diagramType: "context"`, `view: "context"`, `roots: string[]`
- [x] Add both to `DiagramArtifact` union

#### Step 3: Web mirror types — `packages/web/src/types.ts`
- [x] Add `BuildingBlockDiagramNode`, `ContextDiagramNode` to AST section
- [x] Update `DiagramNode` union
- [x] Add `BuildingBlockDiagram`, `ContextDiagram` to model section
- [x] Update `DiagramArtifact` union

#### Step 4: Parser — `packages/core/src/parser/markdown-parser.ts`
- [x] Add `view === "building-block"` branch → `BuildingBlockDiagramNode` with `roots`
- [x] Add `view === "context"` branch → `ContextDiagramNode` with `roots`

#### Step 5: Builder — `packages/core/src/model/builder.ts`
- [x] Handle `diagramType === "building-block"` and `"context"` nodes: store source verbatim, push `BuildingBlockDiagram`/`ContextDiagram` to `diagrams` (no two-pass needed — source is authored, not generated)

#### Step 6: Core barrel exports — `packages/core/src/index.ts`
- [x] Export `BuildingBlockDiagram`, `ContextDiagram` types

#### Step 7: E008 — skip new diagram types
- [x] Add `if (diagram.diagramType === "building-block") continue;` and `if (diagram.diagramType === "context") continue;` in `e008-diagram-validation.ts` to prevent "unsupported notation" false positives

#### Step 8: Validator rule W019 — missing building-block diagram
- [x] Create `packages/core/src/validator/rules/w019-missing-building-block-diagram.ts`
- [x] Detects `05-*.arc42.md` with no `building-block` diagram → `W019` warning

#### Step 9: Validator rule W020 — missing context diagram
- [x] Create `packages/core/src/validator/rules/w020-missing-context-diagram.ts`
- [x] Same pattern for `03-*.arc42.md` and `diagramType === "context"`

#### Step 10: Validator rule H015 — incomplete hierarchy
- [x] Create `packages/core/src/validator/rules/h015-building-block-diagram-incomplete-hierarchy.ts`
- [x] Union coverage: hint per block whose id is absent from all diagram sources in the ch5 file

#### Step 11: Validator rule H016 — missing interfaces
- [x] Create `packages/core/src/validator/rules/h016-building-block-diagram-missing-interfaces.ts`
- [x] Union coverage: hint per interface whose both endpoint ids appear in union source but interface id does not

#### Step 12: Register new rules in `packages/core/src/validator/rules/index.ts`
- [x] Import and register W019, W020, H015, H016

#### Step 13: Web view components — `packages/web/src/`
- [x] Collapse duplicate `reconstructBlockSource`/`reconstructArc42FenceSource` in `AstNodeRenderer.tsx` into one function
- [x] Create `GenericDiagramView.tsx`, `SequenceDiagramView.tsx`, `DeploymentDiagramView.tsx`
- [x] Create `BuildingBlockDiagramView.tsx`, `ContextDiagramView.tsx`
- [x] Update `AstNodeRenderer.tsx` `case "diagram"`: dispatch by `diagramType`

#### Step 14: Update example files
- [x] Add `:::diagram view: building-block notation: mermaid` + complete Mermaid source to `05-building-blocks.arc42.md`
- [x] Add `:::diagram view: context notation: mermaid` + complete Mermaid source to `03-context.arc42.md`
- [x] Update edge labels to use interface ids in both example files
- [x] Add diagrams to `docs/arc42` (dogfood) and validate clean

#### Step 15: Validator rules added during implementation
- [x] E012 — sequence diagram semantic validation (extracted from E008)
- [x] E013 — building-block diagram structural validation (unknown ids in source)
- [x] E014 — context diagram structural validation (unknown ids in source)
- [x] H017 — child block shown without parent in building-block diagram
- [x] W021 — context diagram missing system boundary subgraph
- [x] W022 — building-block diagram edge without backing interface or missing interface id label
- [x] W023 — context diagram edge without backing interface or missing interface id label
- [x] `mermaid-utils.ts` shared utilities: `extractMermaidIds`, `sourceContainsId`, `extractMermaidEdges`

#### Step 16: Web label resolution
- [x] `resolveInterfaceLabels()` in `AstNodeRenderer.tsx`: replaces interface id edge labels with interface protocol (fallback to title) before passing source to Mermaid renderer
- [x] `BuildingBlockDiagramView` and `ContextDiagramView` accept `interfaceMap` prop and apply resolution

#### Step 17: Tests
- [x] `packages/core/tests/building-block-diagram.test.ts`: parser, builder, W019, H015, H016, E008 dedup, E013, H017
- [x] `packages/core/tests/context-diagram.test.ts`: parser, builder, W020
- [x] Full test suite passes (279 tests, 0 failures)

### Completed
- [x] All code tasks complete. 279 tests passing. TypeScript clean. Pre-commit hooks pass.
- [x] docs/arc42: 0 errors, 0 warnings, 0 hints
- [x] examples/bookstore-backend: 0 errors, 0 warnings

---

## Commit
### Tasks
- [ ] Squash WIP commits into a clean final commit

### Completed
*None yet*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
