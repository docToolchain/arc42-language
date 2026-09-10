# Development Plan: arc42-language (feat/modeling-quality-hints branch)

*Generated on 2026-09-10 by Vibe Feature MCP*
*Workflow: [tdd](https://codemcp.github.io/workflows/workflows/tdd)*

## Goal
Add H022 — a validator hint that fires when a root building block participates in interfaces (provides or consumes) but is not reachable from any actor through the interface graph. The rule makes unmodeled external stakeholders visible (e.g. `bb-site` with no `actor-visitor`).

## Key Decisions
- **H022 only, H023 dropped**: The user confirmed only one rule was needed. The diagram-level concern (H023) is a symptom of missing actor modeling — fixing H022 drives the user to add an actor, which also resolves the diagram concern.
- **Scope: root blocks only**: Child blocks (those with `parent`) are excluded. Internal decomposition is not expected to have a direct actor entry point.
- **Guard: no actors → no firing**: If no actors exist at all, H008 is the relevant signal, not H022.
- **Guard: no interfaces → no firing**: H004 already covers blocks with no interfaces; H022 only fires when the block participates in an interface (provides or consumes) but is unreachable.
- **Participation includes consuming**: A block that only `requires` an interface (consumes, but provides none) is still "connected" in the interface graph and should be reachable from an actor. This was discovered via the real `bb-site` case — it has no interface it provides, only one it requires.
- **Reachability via BFS on interfaceEdges**: Seed from actor-owned edges, expand through building-block requires chains. Uses the existing `index.interfaceEdges` — no new index structure needed.
- **Diagnostic location**: Points at the unreachable block's own `loc`, not the interface or actor.
- **Import cleanup in refactor**: Replaced unsafe `Extract<typeof e, …>` cast with a proper `Interface` type guard import.
- **arc42 docs fix**: Added `actor-visitor` (type: person, requires: `if-site-web`) and `if-site-web` interface (provider: `bb-site`, path: `packages/site/index.html`) to make `bb-site` and `bb-verdicts` reachable. Also added `bb-site` to the context diagram's system subgraph.

## Notes
- `index.interfaceEdges` contains `DirectedInterfaceEdge[]` with `consumer` (actor or bb) and `provider` (bb) fields — well-suited for BFS reachability.
- The CLI's built dist was stale — `validateWorkspace` used the old rule without H022. After rebuilding `workspace-fs`, the CLI correctly surfaced both H022 hints.
- The real-world case revealed the "provides only" guard was too narrow: `bb-site` consumes `if-site-verdicts` but provides nothing — yet it's still a meaningful architectural node that deserves an actor path.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] Explored existing rules H001–H021, rule registry, test patterns
- [x] Confirmed H022 semantics: root blocks with interfaces but no actor path
- [x] Decided H023 is not needed (one rule is sufficient)

## Red
### Tasks

### Completed
- [x] Wrote `validator-h022.test.ts` with 8 test cases covering: direct reachability, unreachable fires, no-actors guard, leaf-block exclusion, no-interface exclusion, consumer-only block fires, transitive reachability, location reporting, multiple unreachable blocks
- [x] Confirmed 3 tests fail for the right reason (H022 code not yet implemented)

## Green
### Tasks

### Completed
- [x] Implemented `h022-building-block-no-actor-path.ts` with BFS reachability over `index.interfaceEdges`
- [x] Registered rule in `packages/core/src/validator/rules/index.ts`
- [x] All 279 tests pass; arc42 workspace: 0 errors, 0 warnings, 0 hints

## Refactor
### Tasks

### Completed
- [x] Replaced `Extract<typeof e, { kind: "interface" }>` cast with proper `Interface` type guard import
- [x] Extended participation check: blocks that only consume interfaces (no provided interfaces) now also trigger H022
- [x] Added test case for consumer-only block (real-world `bb-site` pattern)
- [x] Fixed arc42 docs: added `actor-visitor`, `if-site-web`, updated context diagram — workspace validates clean
- [x] **P2** — Replaced `workspace.elements.find()` id lookups with `index.byId.get()` (O(1), matches project convention)
- [x] **P2** — Pre-built `consumerToProviders` adjacency map before BFS, replacing O(V·E) inner loop with O(V+E) traversal
- [x] **P3** — Added test: consumer-only block IS reachable → no diagnostic
- [x] **P3** — Added tests: unreachable cycle fires for both nodes; reachable cycle produces no diagnostic

## Done
### Tasks

### Completed
- [x] H022 rule shipped: 282/282 tests passing, arc42 workspace clean (0 errors, 0 warnings, 0 hints)



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
