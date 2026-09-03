# Development Plan: arc42-language (feat/arc42-rules-and-agent-template branch)

_Generated on 2026-08-18 by Vibe Feature MCP_
_Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)_

## Goal

Extend the arc42-language DSL with new block types covering more arc42 sections, implement new validation rules derived from the full arc42 template (all 12 sections), and improve the agent-facing SKILL.md with an optimized template that instructs agents how to use the DSL format correctly.

## Key Decisions

### DSL structure constraint (critical)

Every block is anchored to a Markdown `##` heading. The convention is: one heading → one prose paragraph → one block. This means:

- **No list-style sub-tables inside a block** — items in tables (e.g. stakeholders, risks, glossary terms) cannot be individually referenced by ID and would become anonymous data.
- Solution: each arc42 item that needs an ID gets its own `##` section. Items that are purely descriptive and never cross-referenced may be prose-only (no block).

### New block types to add

Three new block types cover arc42 sections 2, 11, and 12:

| Block type      | Arc42 section | Required fields             | Optional fields |
| --------------- | ------------- | --------------------------- | --------------- |
| `constraint`    | 2             | `id`, `title`, `category`   | `source`        |
| `risk`          | 11            | `id`, `title`, `severity`   | `mitigation`    |
| `glossary-term` | 12            | `id`, `title`, `definition` | —               |

**`constraint` field spec:**

- `id`: string (required, must be unique)
- `title`: string (required)
- `category`: `technical` | `organizational` | `convention` (required, validated at parse time)
- `source`: free string, e.g. "GDPR Art. 25" or "Client requirement" (optional)

**`risk` field spec:**

- `id`: string (required, must be unique)
- `title`: string (required)
- `severity`: `high` | `medium` | `low` (required, validated at parse time)
- `mitigation`: free string describing the mitigation strategy (optional)

**`glossary-term` field spec:**

- `id`: string (required, must be unique)
- `title`: string (required) — the term name
- `definition`: string (required) — the definition text

**Not adding** (arc42 sections 3, 4, 6, 7, 1-stakeholder, 10):

- Sections 3/4/6/7 need diagram/graph types requiring richer AST nodes — out of scope.
- Section 1 stakeholder table: stakeholders are prose-only in arc42 (never cross-referenced) — prose is sufficient.
- Section 10 quality scenarios: quality goals already carry `scenario:` as a field; ISO-25010 scenario trees are out of scope.

### Rule numbering

Continue from existing: next E = E006, next W = W006, next H = H004.

### New validation rules — exact check logic

**CONSISTENCY (E) — structural errors (fail validation):**

| Code | File                                        | Check logic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E006 | `e006-superseded-decision-no-supersedes.ts` | For each `decision` where `status === "superseded"`: check that `attributes["supersedes"]` is non-empty AND resolves to a known decision id. If missing → "Missing required attribute 'supersedes' on superseded decision". If present but unknown → "Superseded decision references unknown id '...' in 'supersedes'" (handled by E002 for the ref, E006 only checks presence).                                                                                                                  |
| E007 | `e007-invalid-risk-severity.ts`             | Implemented at **parse time in builder.ts** — if `risk.severity` is missing or not in `["high","medium","low"]`, add a parseError. No separate rule file needed; E005 surfaces parse errors. Rule file adds a post-build check as second line of defense: for each `risk` element (after successful parse), severity is already typed — rule is actually not needed post-build since builder rejects bad severity. **Decision: implement only in builder.ts, document as part of E005 coverage.** |
| E008 | `e008-invalid-constraint-category.ts`       | Same as E007: implement at parse time in builder.ts. **Decision: implement only in builder.ts, document as part of E005 coverage.**                                                                                                                                                                                                                                                                                                                                                               |

Note: E007 and E008 are enforced by the builder (like quality-goal priority and decision status), so they surface as E005 parse errors — no separate rule files needed.

**GAP (W) — missing important content (warnings):**

| Code | File                             | Check logic                                                                                                                                                                                                                                                                                                                 |
| ---- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W006 | `w006-too-few-quality-goals.ts`  | Count elements where `kind === "quality-goal"`. If count < 3 AND count > 0 → warning at workspace level (no specific file/line). Message: "Workspace has only N quality goal(s) — arc42 recommends 3–5 (chapter 1)". If count === 0 → no warning (W007 covers that separately; zero goals is a gap but a different signal). |
| W007 | `w007-too-many-quality-goals.ts` | Count elements where `kind === "quality-goal"`. If count > 5 → warning. Message: "Workspace has N quality goals — arc42 recommends 3–5; more than 5 makes prioritisation harder (chapter 1)". Report at first quality-goal's loc to give a file/line.                                                                       |
| W008 | `w008-decision-no-date.ts`       | For each `decision` where `date` is undefined/empty → warning. Message: "Decision '...' has no date — decisions should be dated for traceability (chapter 9)". Report at decision loc.                                                                                                                                      |
| W009 | `w009-risk-no-mitigation.ts`     | For each `risk` where `mitigation` is undefined/empty → warning. Message: "Risk '...' has no mitigation strategy — document how this risk is addressed (chapter 11)". Report at risk loc.                                                                                                                                   |

**SMELL (H) — suspicious best-practice hints:**

| Code | File                                               | Check logic                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H004 | `h004-building-block-unreferenced-by-interface.ts` | For each `building-block`: check if `index.refsTo.get(el.id)` contains at least one id whose element kind is `interface`. If no interface references this block → hint. Exclude blocks that have a `parent` (leaf blocks in a hierarchy may legitimately have no direct interface). Message: "Building block '...' is not referenced by any interface — consider connecting it or removing it (chapter 5)". |
| H005 | `h005-concepts-never-implemented.ts`               | Count `concept` elements. If count > 0 AND zero `building-block` elements have a non-empty `implements` array → hint at workspace level. Message: "Workspace has N concept(s) but no building block uses 'implements:' — cross-cutting concepts should be referenced from building blocks (chapter 8)".                                                                                                     |
| H006 | `h006-constraint-unaddressed.ts`                   | For each `constraint`: check `index.refsTo.get(el.id)` — if empty or no referencing element is a `decision` → hint. Message: "Constraint '...' is not addressed by any decision — constraints should drive architecture decisions (chapter 2 → chapter 9)".                                                                                                                                                 |
| H007 | `h007-risk-unaddressed.ts`                         | For each `risk`: check `index.refsTo.get(el.id)` — if empty or no referencing element is a `decision` → hint. Message: "Risk '...' is not addressed by any decision — risks should be mitigated through documented decisions (chapter 11 → chapter 9)".                                                                                                                                                     |

Note: H006 and H007 require that `decision.addresses` can reference `constraint` and `risk` IDs. The resolver already tracks all cross-references generically via `addRef`, so any ID in `addresses` will be indexed. E002 will flag unknown IDs. No model change needed — it's a semantic extension of the existing `addresses` field.

### `Decision` model extension

Add `supersedes?: string` to the `Decision` interface and parse it in builder.ts. The resolver's `addRef` must register this reference so E002 catches unknown targets.

### Starter template files

A set of pre-populated `.arc42.md` files in `templates/starter/` that give users and agents a valid, commented starting point. These are static files — no CLI changes needed. SKILL.md references them.

**Template file list:**
| File | Arc42 chapters covered |
|------|------------------------|
| `01-quality-goals.arc42.md` | Chapter 1 |
| `02-constraints.arc42.md` | Chapter 2 |
| `05-building-blocks.arc42.md` | Chapters 5 (building-block + interface) |
| `08-concepts.arc42.md` | Chapter 8 |
| `09-decisions.arc42.md` | Chapter 9 |
| `11-risks.arc42.md` | Chapter 11 |
| `12-glossary.arc42.md` | Chapter 12 |

**Template design principles:**

- Each file has a `# Chapter Title` H1 heading with a 1–2 sentence chapeau explaining what goes here
- Each example element has a `## Element Name` heading, a 1–2 sentence inline comment explaining the field choices, and a complete DSL block showing all available fields (required + optional with placeholder values)
- IDs use the conventional prefix pattern: `qg-`, `con-`, `bb-`, `if-`, `concept-`, `dec-`, `risk-`, `term-`
- The placeholder content is a generic "my-system" system (neutral, not bookstore-specific) so agents don't accidentally copy domain-specific data
- Files are valid and would pass `arc42 validate` out of the box (no broken references across files, since each file is standalone — cross-references are shown commented out or using IDs defined in the same file)
- Brief inline comments (HTML-style `<!-- -->` is not valid Markdown for the parser — use prose paragraphs) explain what each field means and which values are allowed

**Cross-reference strategy in templates:**

- `building-block.implements` references a concept defined in the same `05-building-blocks.arc42.md` file? No — concepts live in `08-concepts.arc42.md`. Since templates are standalone files that users will copy together, IDs must be consistent across files. Use a simple cross-reference scheme: `bb-` IDs defined in `05`, referenced in `05` for interfaces; `concept-` IDs defined in `08`, referenced via `implements:` in `05`; `qg-` IDs defined in `01`, referenced via `addresses:` in `09`; `risk-` and `con-` IDs defined in their files, referenced in `09`. The validator will validate the full workspace (all files together) so the cross-references will resolve when all template files are present.

### SKILL.md improvements

- Complete block-type reference table (all 8 types: 5 existing + 3 new) with all fields, required/optional markers
- Arc42 chapter → block type mapping (chapters 1, 2, 5, 8, 9, 11, 12)
- Explicit one-heading-per-element structural rule
- Cross-reference field guide: which field (`between`, `implements`, `parent`, `addresses`, `supersedes`) links to which type
- Short summary of all validation rules grouped by severity
- Reference to `templates/starter/` so agents can use the files as a starting point

### Implementation order

The dependency chain dictates this order:

1. **ast.ts** — extend `BlockType` union (new types needed for TypeScript to compile)
2. **model/types.ts** — add interfaces + update `ELEMENT_KIND_ORDER`, `ELEMENT_CHAPTER`, `CHAPTER_TITLE`; add `supersedes` to `Decision`
3. **model/builder.ts** — add to `KNOWN_BLOCK_TYPES`, add parsing branches for 3 new types + parse `supersedes` on decision
4. **resolver/index.ts** — add `addRef` for `decision.supersedes` and any new ref fields
5. **renderer/text.ts** — add render methods for 3 new types
6. **renderer/json.ts** — no change needed (passes elements as-is via JSON.stringify)
7. **validator/rules/**: 8 new rule files (E006, W006–W009, H004–H007)
8. **validator/rules/index.ts** — register 8 new rules
9. **packages/skill/SKILL.md** — rewrite with full block reference + chapter map + rule summary

### Edge cases and risks

- W006/W007: if workspace has 0 quality goals, neither W006 nor W007 fires. This is intentional — zero goals is caught indirectly by H002 having no targets. Adding a W for "no quality goals" would require a workspace-level rule with no file/line, which is unusual. Accept this gap for now.
- H004: parent-child building blocks — a leaf block inside a parent may legitimately have no interface. Excluding blocks with `parent` set avoids false positives. Root blocks without interfaces are still flagged.
- H006/H007: the `refsTo` map is keyed by target ID. If a decision addresses a constraint or risk ID, `addRef` already records it. The check just needs to find any entry in `refsTo.get(constraintId)` whose corresponding element is a decision.
- glossary-term `definition` field: it can be a long string with spaces. The YAML-like parser in the project may or may not support multi-line values — check the parser to confirm. If not, definition must be a single line. **Risk: low — single-line definitions are acceptable for a structured block; prose above the block provides fuller context.**
- `supersedes` field on `Decision`: this is a new optional field. E002 (unresolved reference) will naturally catch bad IDs once the resolver calls `addRef` for it. E006 catches the case where `status: superseded` but `supersedes` is absent.

---

## Explore

### Tasks

- [x] Read arc42 docs for all 12 sections and compile potential rules
- [x] Classify rules into CONSISTENCY / GAP / SMELL
- [x] Cross-reference proposed rules with existing rules to avoid duplication
- [x] Identify feasible new rules given the current DSL model fields
- [x] Read all model/builder/resolver/validator/renderer source files
- [x] Understand the one-heading-per-element DSL constraint
- [x] Decide which new block types to add and what fields they carry
- [x] Document findings in plan file

## Plan

### Tasks

- [x] Define implementation order and file naming for all changes
- [x] Spec out exact field validation for new block types (constraint, risk, glossary-term)
- [x] Spec out exact check logic for each new rule (E006, W006–W009, H004–H007)
- [x] Decide on E007/E008 — builder-only (no separate rule files)
- [x] Decide on Decision.supersedes field and resolver impact
- [x] Identify edge cases (W006 zero-goals gap, H004 parent exclusion, H006/H007 cross-type refs)
- [x] Confirm json renderer needs no change
- [x] Document all changes in plan file

## Code

### Tasks

**Step 1 — DSL model extension**

- [ ] `packages/core/src/ast.ts`: add `"constraint" | "risk" | "glossary-term"` to `BlockType` union
- [ ] `packages/core/src/model/types.ts`:
  - Add `Constraint` interface (id, title, category, source?, loc)
  - Add `Risk` interface (id, title, severity, mitigation?, loc)
  - Add `GlossaryTerm` interface (id, title, definition, loc)
  - Add `supersedes?: string` to `Decision` interface
  - Add new kinds to `Element` union
  - Add new kinds to `ELEMENT_KIND_ORDER` (order: ch2 before ch5, ch11 and ch12 after ch9)
  - Add new kinds to `ELEMENT_CHAPTER` (constraint→2, risk→11, glossary-term→12)
  - Add new chapter titles to `CHAPTER_TITLE` (2→"Constraints", 11→"Risks and Technical Debt", 12→"Glossary")
- [ ] `packages/core/src/model/builder.ts`:
  - Add new types to `KNOWN_BLOCK_TYPES`
  - Add import for new interfaces
  - Add parsing branch for `constraint` (validate category enum)
  - Add parsing branch for `risk` (validate severity enum)
  - Add parsing branch for `glossary-term` (require definition)
  - Add `supersedes: attributes["supersedes"]` to `decision` parsing
- [ ] `packages/core/src/resolver/index.ts`:
  - Add `addRef(el.id, el.supersedes)` for decisions with supersedes set

**Step 2 — Renderers**

- [ ] `packages/core/src/renderer/text.ts`:
  - Add import for `Constraint`, `Risk`, `GlossaryTerm`
  - Add `renderConstraint`, `renderRisk`, `renderGlossaryTerm` private methods
  - Add cases in `renderElementLine` and `renderElement` switch statements
  - Add `supersedes` display in `renderDecision`

**Step 3 — New rule files**

- [ ] `packages/core/src/validator/rules/e006-superseded-decision-no-supersedes.ts`
- [ ] `packages/core/src/validator/rules/w006-too-few-quality-goals.ts`
- [ ] `packages/core/src/validator/rules/w007-too-many-quality-goals.ts`
- [ ] `packages/core/src/validator/rules/w008-decision-no-date.ts`
- [ ] `packages/core/src/validator/rules/w009-risk-no-mitigation.ts`
- [ ] `packages/core/src/validator/rules/h004-building-block-unreferenced-by-interface.ts`
- [ ] `packages/core/src/validator/rules/h005-concepts-never-implemented.ts`
- [ ] `packages/core/src/validator/rules/h006-constraint-unaddressed.ts`
- [ ] `packages/core/src/validator/rules/h007-risk-unaddressed.ts`

**Step 4 — Rule registry**

- [ ] `packages/core/src/validator/rules/index.ts`: import and register all 8 new rules in the correct order

## Code

### Tasks

**Step 1 — DSL model extension**

- [x] `packages/core/src/ast.ts`: add `"constraint" | "risk" | "glossary-term"` to `BlockType` union
- [x] `packages/core/src/model/types.ts`:
  - Add `Constraint` interface (id, title, category, source?, loc)
  - Add `Risk` interface (id, title, severity, mitigation?, loc)
  - Add `GlossaryTerm` interface (id, title, definition, loc)
  - Add `supersedes?: string` to `Decision` interface
  - Add new kinds to `Element` union
  - Add new kinds to `ELEMENT_KIND_ORDER` (order: ch2 before ch5, ch11 and ch12 after ch9)
  - Add new kinds to `ELEMENT_CHAPTER` (constraint→2, risk→11, glossary-term→12)
  - Add new chapter titles to `CHAPTER_TITLE` (2→"Constraints", 11→"Risks and Technical Debt", 12→"Glossary")
- [x] `packages/core/src/model/builder.ts`:
  - Add new types to `KNOWN_BLOCK_TYPES`
  - Add import for new interfaces
  - Add parsing branch for `constraint` (validate category enum)
  - Add parsing branch for `risk` (validate severity enum)
  - Add parsing branch for `glossary-term` (require definition)
  - Add `supersedes: attributes["supersedes"]` to `decision` parsing
- [x] `packages/core/src/resolver/index.ts`:
  - Add `addRef(el.id, el.supersedes)` for decisions with supersedes set

**Step 2 — Renderers**

- [x] `packages/core/src/renderer/text.ts`:
  - Add import for `Constraint`, `Risk`, `GlossaryTerm`
  - Add `renderConstraint`, `renderRisk`, `renderGlossaryTerm` private methods
  - Add cases in `renderElementLine` and `renderElement` switch statements
  - Add `supersedes` display in `renderDecision`

**Step 3 — New rule files**

- [x] `packages/core/src/validator/rules/e006-superseded-decision-no-supersedes.ts`
- [x] `packages/core/src/validator/rules/w006-too-few-quality-goals.ts`
- [x] `packages/core/src/validator/rules/w007-too-many-quality-goals.ts`
- [x] `packages/core/src/validator/rules/w008-decision-no-date.ts`
- [x] `packages/core/src/validator/rules/w009-risk-no-mitigation.ts`
- [x] `packages/core/src/validator/rules/h004-building-block-unreferenced-by-interface.ts`
- [x] `packages/core/src/validator/rules/h005-concepts-never-implemented.ts`
- [x] `packages/core/src/validator/rules/h006-constraint-unaddressed.ts`
- [x] `packages/core/src/validator/rules/h007-risk-unaddressed.ts`

**Step 4 — Rule registry**

- [x] `packages/core/src/validator/rules/index.ts`: import and register all 8 new rules in the correct order

**Step 5 — Starter templates**

- [x] `templates/starter/01-quality-goals.arc42.md`
- [x] `templates/starter/02-constraints.arc42.md`
- [x] `templates/starter/05-building-blocks.arc42.md`
- [x] `templates/starter/08-concepts.arc42.md`
- [x] `templates/starter/09-decisions.arc42.md`
- [x] `templates/starter/11-risks.arc42.md`
- [x] `templates/starter/12-glossary.arc42.md`
- [x] Verified template files: `arc42 validate --dir templates/starter` → 0 errors, 0 warnings, 4 hints (expected — con-api-versioning, qg-modifiability, risk-shared-db, risk-no-perf-tests have no addressing decision, which is correct for a starter template)

**Step 6 — SKILL.md**

- [x] `packages/skill/SKILL.md`: rewritten with full block reference, chapter map, structural rules, cross-ref guide, rule summary, and pointer to `templates/starter/`

**Step 7 — Build verification**

- [x] `pnpm --filter @arc42/core run build` → success
- [x] `pnpm --filter @arc42/cli run build` → success
- [x] `pnpm --filter @arc42/core run test` → all 68 tests pass (fixed pre-existing path bug in `renderer.test.ts`: replaced `process.cwd()` with `import.meta.url`/`fileURLToPath` for fixture path resolution, matching the pattern in `validate-workspace.test.ts`)
- [x] `arc42 validate --dir examples/bookstore-backend` → 0 errors (existing workspace clean)
- [x] `arc42 get --dir templates/starter` → all 8 block types render correctly

### Completed

All steps complete.

### Key implementation decisions made during coding

- **CLI `BLOCK_TYPES` and `CHAPTER_NAMES`**: updated to include all 8 types and chapters 2/11/12 so `--type` validation and `rules --chapter` grouping work correctly
- **Renderer `renderElementLine` exhaustiveness**: TypeScript switch now covers all 8 cases, keeping the compiler happy with the exhaustive discriminated union
- **Template hints are intentional**: the starter templates produce 4 hints (H002, H006×1, H007×2) because the starter workspace has no decisions addressing `qg-modifiability`, `con-api-versioning`, or the two risks. This is correct — it shows the user what to add next rather than suppressing meaningful feedback.
- **Pre-existing test failures confirmed**: the 16 renderer.test.ts failures exist on the base branch (fixture path bug) and are not caused by this branch's changes. No new failures introduced.

## Commit

### Tasks

- [ ] Stage and commit all changes on `feat/arc42-rules-and-agent-template`

### Completed

_None yet_

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
