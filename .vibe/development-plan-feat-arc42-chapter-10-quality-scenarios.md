# Development Plan: arc42-language (feat/arc42-chapter-10-quality-scenarios branch)

_Generated on 2026-09-03 by Vibe Feature MCP_
_Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)_

## Goal

Add support for arc42 chapter 10 (Quality Requirements) by:

1. Moving `quality-goal` from chapter 1 to chapter 10 (canonical home per arc42 standard)
2. Introducing a new `quality-scenario` block type for ch.10.2 (concrete, measurable elaborations)
3. Updating validation rules to reflect the new chapter assignment
4. Enforcing that every quality goal is elaborated by at least one quality scenario (subset invariant)
5. Ch.1.2 becomes a _rendered view_ of the top 3-5 `priority: high` goals — a documentation
   convention in the template, not a separate block type

## Key Decisions

### KD-1: `quality-goal` moves from ch.1 to ch.10 (breaking change, accepted)

The canonical home of quality goals per the arc42 standard is ch.10 (full catalog).
Ch.1.2 is a curated summary of the top 3-5 — a rendered view, not a separate entity.
`ELEMENT_CHAPTER["quality-goal"]` changes from `1` to `10`.
`ELEMENT_KIND_ORDER` moves `"quality-goal"` to between `"decision"` and `"risk"`.
`CHAPTER_TITLE[10]` = `"Quality Requirements"`.
Existing workspaces continue to parse and validate — the blocks just render under ch.10 now.

### KD-2: One new block type — `quality-scenario` for ch.10.2

Quality scenarios make quality requirements concrete and measurable. They reference a
`quality-goal` via the required `quality` field. Ch.10.1 (overview) is prose — no block needed.

Fields:

- `id` — required
- `title` — required
- `quality` — required, cross-reference to a `quality-goal` id
- `stimulus` — optional, what triggers the scenario
- `response` — optional, expected system behaviour
- `metric` — optional, measurable acceptance criterion (absence triggers W013)

Example:

```
:::quality-scenario
id: qs-api-latency
title: API responds within 200ms under load
quality: qg-performance
stimulus: 1000 concurrent users submit requests
response: All API endpoints respond within the time limit
metric: p95 latency < 200ms, measured in k6 load test
:::
```

### KD-3: `quality` field is required and resolved by E002

Every `quality-scenario` must reference a `quality-goal`. This is required (not optional)
because a scenario without a backing goal is untraceable. E002 (existing unresolved reference
rule) covers this for free once the resolver is wired.

### KD-4: No changes to E001 (duplicate id rule)

We explored allowing same-id duplicates for ch.1/ch.10 echoing but decided instead to move
`quality-goal` to ch.10 entirely. Ch.1.2 becomes a rendered/filtered view. E001 stays unchanged.

### KD-5: W006/W007 updated to count `priority: high` goals only

With the full quality catalog in ch.10, total goal count is no longer meaningful for the
"3-5 goals" check. W006/W007 are updated to count only `priority: high` goals (those that
represent the ch.1 executive summary). `arc42Chapter` on both rules changes from `1` to `10`.

### KD-6: H002/H010 updated — `arc42Chapter` → 10; H010 scoped to high-priority

H002 (quality goal not addressed by decision) and H010 (quality goal not addressed by solution
strategy) both update their `arc42Chapter` from `1` to `10`. H010 is additionally scoped to
`priority: high` goals only, since the solution strategy addresses the most important goals —
firing for low-priority goals is noise.

### KD-7: Two new validation rules

- **W013** (warning): `quality-scenario` has no `metric` — without a measurable criterion
  the scenario cannot be used for architecture evaluation (ATAM, acceptance testing)
- **H013** (hint): `quality-goal` has no elaborating `quality-scenario` — the goal is stated
  but never made concrete and testable in ch.10.2. Enforces the subset invariant.

### KD-8: Existing workspace files need updating

`docs/arc42/01-quality-goals.arc42.md` should become (or be supplemented by)
`docs/arc42/10-quality-requirements.arc42.md` since `quality-goal` blocks now live in ch.10.
Same for examples and fixtures. The ch.1 file becomes prose-only with a template comment.

## Notes

### arc42 standard research findings

- Ch.1.2 is the top-3-5 quality goals summary; ch.10 is the complete catalog
- Arc42 tip 1-18: "Defer detailed and complete quality requirements to section 10"
- Arc42 section 1.2: goals "should only be referenced" in section 10 (not duplicated)
- Quality scenarios (ch.10.2): Source/Stimulus, Context/Background, Metric (short form)
  or full SEI long form (Source, Stimulus, Environment, Artifact, Response, Response Measure)
- The Q42 quality model (quality.arc42.org) provides 191 quality characteristics with examples

### Consistency chain across chapters

```
quality-goal (ch.10.1) ← elaborated by ← quality-scenario (ch.10.2)  [new H013]
quality-goal (ch.10.1) ← addressed by  ← decision (ch.9)             [existing H002]
quality-goal (ch.10.1) ← addressed by  ← solution-strategy (ch.4)    [existing H010]
```

### Full scope of changes

**Core model:**

1. `ast.ts` — add `"quality-scenario"` to `BlockType` union
2. `model/types.ts` — add `QualityScenario` interface; update `ELEMENT_KIND_ORDER`
   (move `quality-goal` after `decision`, add `quality-scenario` after it);
   update `ELEMENT_CHAPTER` (`quality-goal` → 10, add `quality-scenario` → 10);
   update `CHAPTER_TITLE` (add `10: "Quality Requirements"`, remove ch.1 if no block type);
   update `Element` union; update comment block
3. `model/builder.ts` — add `"quality-scenario"` to `KNOWN_BLOCK_TYPES`; add builder branch
4. `resolver/index.ts` — add `addRef` for `quality-scenario.quality` field
5. `arc42.ts` — add edge for `quality-scenario.quality` in `buildEdges`; add public
   re-export of `QualityScenario`
6. `validator/types.ts` — add `10` to `Arc42Chapter` union

**Renderer:** 7. `renderer/types.ts` — add `"quality-scenario"` to `ElementRenderers` interface 8. `renderer/text.ts` — add render methods for workspace line and element detail

**Updated validation rules:** 9. `validator/rules/w006-too-few-quality-goals.ts` — count only `priority: high` goals;
update rationale and `arc42Chapter` to `10` 10. `validator/rules/w007-too-many-quality-goals.ts` — count only `priority: high` goals;
update rationale and `arc42Chapter` to `10` 11. `validator/rules/h002-quality-goal-unaddressed.ts` — update `arc42Chapter` to `10` 12. `validator/rules/h010-quality-goal-unaddressed-by-solution-strategy.ts` — update
`arc42Chapter` to `10`; scope to `priority: high` only

**New validation rules:** 13. `validator/rules/w013-quality-scenario-no-metric.ts` — new rule 14. `validator/rules/h013-quality-goal-no-scenario.ts` — new rule 15. `validator/rules/index.ts` — register W013 and H013

**Templates and docs:** 16. `templates/starter/10-quality-requirements.arc42.md` — new template with both
`quality-goal` and `quality-scenario` examples and guidance 17. `templates/starter/01-quality-goals.arc42.md` — update to prose-only; add comment
explaining that top 3-5 `priority: high` goals from ch.10 form the ch.1.2 content 18. `docs/arc42/10-quality-requirements.arc42.md` — new project self-documentation file
(move quality-goal blocks from 01-quality-goals.arc42.md here, add quality-scenarios) 19. `docs/arc42/01-quality-goals.arc42.md` — convert to prose-only (blocks move to ch.10)

**Skill:** 20. `packages/skill/SKILL.md` — add `quality-scenario` row to block type table; update
`quality-goal` chapter reference from ch.1 to ch.10

**Tests:** 21. Builder tests for `quality-scenario` (valid, missing required fields) 22. Resolver tests for `quality-scenario.quality` cross-reference 23. Validator tests for W013 (no metric) and H013 (no scenario) 24. Renderer tests for `quality-scenario` in workspace and element views 25. Update existing tests that rely on `quality-goal` being in chapter 1

## Explore

### Tasks

- [x] Research arc42 chapter 10 standard definition
- [x] Research arc42 chapter 1 / quality goals relationship to ch.10
- [x] Decide on entity model (one vs two block types)
- [x] Decide on `quality-goal` rename vs keep vs move
- [x] Design `quality-scenario` block shape and fields
- [x] Identify all validation rules (cross-section consistency + updated rules)
- [x] Analyze impact on E001 duplicate id rule
- [x] Analyze impact on W006/W007/H002/H010
- [x] Identify all files that need changing
- [x] Capture all decisions in plan file

### Completed

- [x] Created development plan file
- [x] Explored codebase structure (all relevant files read)
- [x] Reviewed arc42 standard docs for ch.1, ch.10
- [x] Agreed on final model: move quality-goal to ch.10, add quality-scenario, update rules

## Plan

### Implementation Order

The changes have strict dependencies. This order ensures the TypeScript compiler is happy
at every step and tests can be run incrementally:

```
1. ast.ts              — extend BlockType union (pure type, no runtime deps)
2. model/types.ts      — add QualityScenario interface + update maps/union
3. model/builder.ts    — parse quality-scenario blocks
4. resolver/index.ts   — wire quality-scenario.quality reference
5. arc42.ts            — add edge + re-export QualityScenario
6. validator/types.ts  — add 10 to Arc42Chapter union
7. renderer/types.ts   — add quality-scenario to ElementRenderers
8. renderer/text.ts    — implement render methods
9. rules w006/w007     — update to count priority:high only + arc42Chapter→10
10. rules h002/h010    — update arc42Chapter→10; scope h010 to high-priority
11. new rule W013       — quality-scenario without metric
12. new rule H013       — quality-goal without quality-scenario
13. rules/index.ts     — register W013 + H013; update chapter comments
14. tests              — builder, resolver, validator, renderer tests
15. docs/arc42/        — move quality-goal blocks to 10-quality-requirements.arc42.md
16. templates/starter/ — new 10-quality-requirements.arc42.md; update 01-quality-goals.arc42.md
17. packages/skill/    — update SKILL.md block type table
```

### Tasks

#### Step 1 — ast.ts: extend BlockType

- [ ] Add `"quality-scenario"` to the `BlockType` union in `packages/core/src/ast.ts`
  - Insert after `"quality-goal"` (alphabetical grouping)

#### Step 2 — model/types.ts: QualityScenario + maps

- [ ] Add `QualityScenario` interface after `QualityGoal`:
  ```ts
  export interface QualityScenario {
    kind: "quality-scenario";
    id: string;
    title: string;
    quality: string; // required — references a quality-goal id
    stimulus?: string;
    response?: string;
    metric?: string;
    loc: SourceLocation;
  }
  ```
- [ ] Update `ELEMENT_KIND_ORDER` comment block: change `1 — Quality Goals` to
      `10 — Quality Requirements` (since quality-goal moves to ch.10)
- [ ] Move `"quality-goal"` in `ELEMENT_KIND_ORDER` from position 0 to after `"decision"`;
      add `"quality-scenario"` immediately after `"quality-goal"`; update comments
- [ ] Update `ELEMENT_CHAPTER`: `"quality-goal": 1` → `"quality-goal": 10`;
      add `"quality-scenario": 10`
- [ ] Update `CHAPTER_TITLE`: remove `1: "Quality Goals"` (ch.1 has no block types now);
      add `10: "Quality Requirements"`
- [ ] Add `QualityScenario` to the `Element` union

#### Step 3 — model/builder.ts: parse quality-scenario

- [ ] Import `QualityScenario` from `./types.ts`
- [ ] Add `"quality-scenario"` to `KNOWN_BLOCK_TYPES` set
- [ ] Add builder branch after the `quality-goal` branch:
  ```ts
  } else if (blockType === "quality-scenario") {
    const quality = attributes["quality"];
    if (!quality) {
      parseErrors.push({ message: "Missing required attribute 'quality' on quality-scenario", ... });
      continue;
    }
    const qs: QualityScenario = {
      kind: "quality-scenario", id, title, quality,
      stimulus: attributes["stimulus"] || undefined,
      response: attributes["response"] || undefined,
      metric: attributes["metric"] || undefined,
      loc,
    };
    elements.push(qs);
  }
  ```

#### Step 4 — resolver/index.ts: wire quality reference

- [ ] Add `else if (el.kind === "quality-scenario")` branch:
  ```ts
  } else if (el.kind === "quality-scenario") {
    addRef(el.id, el.quality);
  }
  ```

#### Step 5 — arc42.ts: edge + re-export

- [ ] Add `quality-scenario` edge in `buildEdges`:
  ```ts
  } else if (el.kind === "quality-scenario") {
    edges.push({ from: el.id, to: el.quality, relation: "elaborates" });
  }
  ```
  Note: `"elaborates"` is a new relation type — add it to the `Edge.relation` union in
  `renderer/types.ts` at the same time (do this in step 7).
- [ ] Add `QualityScenario` to the public re-exports at the bottom of `arc42.ts`

#### Step 6 — validator/types.ts: Arc42Chapter union

- [ ] Add `10` to `Arc42Chapter`: `0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12`
- [ ] Update the JSDoc comment on `arc42Chapter` field to mention ch.10

#### Step 7 — renderer/types.ts: ElementRenderers + Edge relation

- [ ] Import `QualityScenario` from `../model/types.ts`
- [ ] Add `"quality-scenario"` entry to `ElementRenderers` interface:
  ```ts
  "quality-scenario": (el: QualityScenario, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  ```
- [ ] Add `"elaborates"` to `Edge.relation` union

#### Step 8 — renderer/text.ts: render quality-scenario

- [ ] Import `QualityScenario` from `../model/types.ts`
- [ ] Add `case "quality-scenario": return this.renderQualityScenario(el);` to
      `renderElementLine` switch
- [ ] Add `case "quality-scenario":` block to `renderElement` switch:
  ```ts
  case "quality-scenario":
    lines.push(`  quality: ${el.quality}`);
    if (el.stimulus) lines.push(`  stimulus: ${el.stimulus}`);
    if (el.response) lines.push(`  response: ${el.response}`);
    if (el.metric) lines.push(`  metric: ${el.metric}`);
    break;
  ```
- [ ] Add `private renderQualityScenario(el: QualityScenario): string` method:
  ```ts
  private renderQualityScenario(el: QualityScenario): string {
    const lines = [`  ${el.id}  ${el.title}  → ${el.quality}`];
    if (el.metric) lines.push(`    metric: ${el.metric}`);
    return lines.join("\n");
  }
  ```

#### Step 9 — Update W006 and W007

- [ ] `w006-too-few-quality-goals.ts`:
  - Filter to `priority === "high"` goals only
  - Update description: "Workspace has fewer than 3 high-priority quality goals — arc42 recommends 3–5"
  - Update rationale to mention ch.10 and `priority: high`
  - Change `arc42Chapter: 1` → `arc42Chapter: 10`
  - Update message text: change "chapter 1" → "chapter 10"
- [ ] `w007-too-many-quality-goals.ts`: same changes (count `priority: high` only)

#### Step 10 — Update H002 and H010

- [ ] `h002-quality-goal-unaddressed.ts`:
  - Change `arc42Chapter: 1` → `arc42Chapter: 10`
- [ ] `h010-quality-goal-unaddressed-by-solution-strategy.ts`:
  - Change `arc42Chapter: 1` → `arc42Chapter: 10`
  - Add `priority === "high"` filter: only fire for high-priority goals
  - Update rationale to explain why only high-priority goals need solution strategy coverage

#### Step 11 — New rule W013

- [ ] Create `packages/core/src/validator/rules/w013-quality-scenario-no-metric.ts`:
  ```ts
  export const w013QualityScenarioNoMetric: Rule = {
    meta: {
      code: "W013",
      severity: "warning",
      type: "problem",
      docs: {
        description: "Quality scenario has no metric — cannot be used for architecture evaluation",
        rationale: "A quality scenario without a measurable metric is aspirational but not
          testable. Without a metric, you cannot use it for ATAM evaluation or acceptance
          testing. Add a metric that names a threshold and a measurement method.",
        arc42Chapter: 10,
        recommended: true,
      },
    },
    check(workspace, _index) {
      return workspace.elements
        .filter((el) => el.kind === "quality-scenario" && !el.metric)
        .map((el) => ({
          code: "W013", severity: "warning",
          message: `Quality scenario '${el.id}' has no metric — add a measurable acceptance criterion`,
          file: el.loc.file, line: el.loc.line,
        }));
    },
  };
  ```

#### Step 12 — New rule H013

- [ ] Create `packages/core/src/validator/rules/h013-quality-goal-no-scenario.ts`:
  ```ts
  export const h013QualityGoalNoScenario: Rule = {
    meta: {
      code: "H013",
      severity: "hint",
      type: "suggestion",
      docs: {
        description: "Quality goal has no elaborating quality scenario",
        rationale: "Every quality goal should be made concrete and testable through at least
          one quality scenario in ch.10.2. A goal without a scenario is stated intent but
          not actionable for architecture evaluation or acceptance testing.",
        arc42Chapter: 10,
        recommended: true,
      },
    },
    check(workspace, index) {
      return workspace.elements
        .filter((el) => el.kind === "quality-goal")
        .filter((el) => !(index.refsTo.get(el.id) ?? []).some(
          (id) => index.byId.get(id)?.kind === "quality-scenario"
        ))
        .map((el) => ({
          code: "H013", severity: "hint",
          message: `Quality goal '${el.id}' has no elaborating quality scenario`,
          file: el.loc.file, line: el.loc.line,
        }));
    },
  };
  ```

#### Step 13 — rules/index.ts: register W013 + H013

- [ ] Import `w013QualityScenarioNoMetric` and `h013QualityGoalNoScenario`
- [ ] Add W013 to the warnings section (after W012, before hints section)
- [ ] Add H013 to the hints section (after H012)
- [ ] Update chapter comments: W006/W007/H002/H010 comments from "Chapter 1" → "Chapter 10"

#### Step 14 — Tests

- [ ] `packages/core/tests/builder.test.ts` — add tests:
  - Valid `quality-scenario` block parses to correct element shape
  - Missing `quality` attribute → parse error
  - Optional fields (`stimulus`, `response`, `metric`) absent → no error
- [ ] `packages/core/tests/resolver.test.ts` — add test:
  - `quality-scenario.quality` ref wired correctly in `refsFrom`/`refsTo`
- [ ] `packages/core/tests/validator.test.ts` — add tests:
  - W013: scenario without `metric` → W013 fired
  - W013: scenario with `metric` → W013 not fired
  - H013: `quality-goal` with no scenario → H013 fired
  - H013: `quality-goal` with one scenario → H013 not fired
  - W006: only `priority: high` goals counted (2 high + 4 low → W006 fires)
  - W007: only `priority: high` goals counted (6 high → W007 fires, 6 low → no W007)
  - H010: only `priority: high` goals trigger the hint (medium/low are silent)
- [ ] `packages/core/tests/renderer.test.ts` — add tests:
  - `quality-scenario` appears in workspace view under ch.10
  - `quality-scenario` element detail shows all fields
- [ ] Review existing tests that create `quality-goal` elements — no logic changes needed
      (the element shape is unchanged); only update any hard-coded chapter assertions (e.g.
      `arc42Chapter: 1` in W006/W007/H002/H010 rule meta tests if they exist)

#### Step 15 — docs/arc42: migrate quality-goal blocks

- [ ] Create `docs/arc42/10-quality-requirements.arc42.md`:
  - Move all 5 `quality-goal` blocks from `01-quality-goals.arc42.md` here
  - Keep the prose sections alongside each goal
  - Add `quality-scenario` blocks for each goal (at minimum skeleton ones with metric)
  - Add a ch.10.1 heading ("Quality Goals") and ch.10.2 heading ("Quality Scenarios")
- [ ] Update `docs/arc42/01-quality-goals.arc42.md`:
  - Remove all `quality-goal` blocks (they now live in ch.10)
  - Replace with prose that explains the top-3 high-priority goals (readability,
    agent-writability, verifiability) and references the ch.10 file
  - Add a note: "Full catalog with quality scenarios: see 10-quality-requirements.arc42.md"

#### Step 16 — templates/starter: new ch.10 + updated ch.1

- [ ] Create `templates/starter/10-quality-requirements.arc42.md`:
  - Heading: `# Quality Requirements`
  - HTML comment with arc42 guidance for ch.10 (full catalog, all priorities)
  - `## 10.1 Quality Goals` subsection with a commented example `quality-goal` block
    showing all fields including the note about `priority: high` appearing in ch.1.2
  - `## 10.2 Quality Scenarios` subsection with a commented example `quality-scenario` block
    showing all fields with explanation
- [ ] Update `templates/starter/01-quality-goals.arc42.md`:
  - Replace the existing example block with prose-only content
  - Add comment: "The top 3-5 `priority: high` quality goals from chapter 10 form the
    content of this section. Use `arc42 get --type quality-goal` to list them filtered
    by priority, or build a custom renderer that projects high-priority goals here."
  - Remove the DSL block example (it now belongs in the ch.10 template)

#### Step 17 — packages/skill/SKILL.md: update block table

- [ ] Read `packages/skill/SKILL.md` first to understand current table format
- [ ] Update `quality-goal` row: chapter column `1` → `10`
- [ ] Add `quality-scenario` row after `quality-goal`:
      `quality-scenario | 10 | id, title, quality (req), stimulus, response, metric`

### Completed

- [x] Analyzed all source files that require changes (ast, types, builder, resolver, arc42, validator/types, renderer, 4 rule files, rule index, test files, 2 template files, 2 doc files, SKILL.md)
- [x] Verified exact code locations and patterns for every change
- [x] Confirmed test structure (makeWorkspace helper, workspaceFromContent, describe/test pattern)
- [x] Confirmed new `elaborates` relation type needed in Edge union
- [x] Documented precise implementation order respecting TypeScript dependency chain

## Commit

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
