# arc42-language

Architecture was something only architects cared about.
Developers read the docs. Hopefully. Once. At the start.
Then reality kicked in — and the docs stayed behind.

Architecture drift has always existed.
Agents just made it worse: change accelerates, docs don't.

**arc42-language makes architecture a first-class citizen —
readable by humans, checkable by machines, visible to agents.**

![arc42-language demo](demo/demo.gif)

---

A structured language for arc42 software architecture documentation.
Human-readable first — Markdown prose with typed `:::block` fences for structured metadata.
Machine-verifiable second — a CLI validates consistency and coherence across all elements.

## For architects

### What this gives you

- Write architecture documentation in plain Markdown (`.arc42.md` files)
- Embed structured elements — quality goals, solution strategy, building blocks, interfaces, runtime scenarios, concepts, decisions — as typed blocks alongside narrative prose
- Validate that your architecture model is internally consistent: no broken references, no isolated components, no unaddressed quality goals, no forgotten proposed decisions
- Query the model from the command line or pipe JSON into other tools

### The format

Each element lives in its own section: heading, prose explaining purpose and rationale, then the block as the machine-readable summary.

```markdown
## Catalog Service

Owns all product data. The only service that writes to the catalog database.
Search results are cached in Redis to meet the p95 latency target.

```arc42
:::building-block
id: bb-catalog-service
title: Catalog Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::
```
```

The block types cover the main arc42 sections. See the starter templates for ready-to-use files — scaffold them with `arc42 init template`. See `examples/bookstore-backend/` for a complete, valid workspace with realistic prose.

### The CLI

```bash
# Install globally
npm install -g @doc-tc/arc42

# Or run without installing
npx @doc-tc/arc42 init template --dir ./docs
npx @doc-tc/arc42 validate --dir ./docs

# Scaffold starter templates into your workspace
arc42 init template --dir ./docs

# Install the arc42 agent skill (for opencode and compatible agents)
arc42 init skill

# Validate the workspace — fix all errors before committing
arc42 --dir ./docs validate

# Browse all elements grouped by arc42 chapter
arc42 --dir ./docs get

# Inspect a single element with its 1-hop relationships
arc42 --dir ./docs get bb-catalog-service

# Filter by type
arc42 --dir ./docs get --type decision

# Understand what each validation rule enforces and why
arc42 rules

# JSON output for scripting and agent use
arc42 --dir ./docs validate --format json
arc42 --dir ./docs get --format json
```

`--dir` defaults to `$ARC42_DIR` or the current directory.
Exit codes: `0` = no errors, `1` = validation errors or element not found, `2` = usage error.

`arc42 init skill` writes the agent skill to `.agents/skills/arc42/SKILL.md` by default.
Use `--path <dest>` to override the destination.
`arc42 init template` copies all 12 chapter templates; existing files are skipped.

### Validation rules

The validator enforces built-in rules across four categories. Run `arc42 rules` to see each rule with its rationale. The short summary:

- **Errors** (broken model): duplicate ids, unresolved references, circular parent chains, interface pointing at non-building-blocks, missing required attributes
- **Warnings** (inconsistencies): orphaned concepts, isolated building-blocks, stale proposed decisions, blocks without prose, multiple blocks under one heading
- **Hints** (gaps): decisions or solution strategies without quality-goal links, quality goals without decisions or a solution strategy, building-blocks without a technology

### AI agent use

Run `arc42 init skill` in the project root. The skill is written to `.agents/skills/arc42/SKILL.md` by default (use `--path` to override). It orients the agent to the format and instructs it to keep the arc42 files in sync with every architectural change.

---

## For contributors

### Architecture

The codebase is a pnpm monorepo with two packages:

```
packages/
  core/   — pure TypeScript library: parser, model, validator, renderer
  cli/    — thin CLI entry point, delegates everything to core
  skill/  — SKILL.md for opencode agent integration (no code)
```

The pipeline for every command:

```
discoverFiles(dir)
  → MarkdownParser.parse()        — line-oriented, :::type fences
  → buildWorkspace(documents)     — typed element model + parse errors
  → buildIndex(workspace)         — bidirectional reference index
  → validate(workspace, index)    — builtinRules.flatMap(r => r.check())
  → renderers / CLI output
```

### Tech stack

- **TypeScript 5.x** with strict mode
- **pnpm** workspaces
- **vite-plus** (`vp`) — unified toolchain: `vp pack` (build), `vp test` (Vitest), `vp check` (lint + types)
- No runtime dependencies beyond Node.js built-ins

### Building and testing

```bash
pnpm install
pnpm run build   # build core + cli
pnpm run test    # run all tests
pnpm run check   # lint + type-check
pnpm run ready   # check + test + build in one pass
```

### Adding a validation rule

1. Create `packages/core/src/validator/rules/<code>-<name>.ts` — implement the `Rule` interface
2. Fill in `meta.docs.rationale` — explain _why_ the rule exists, not just what it checks
3. Register it in `packages/core/src/validator/rules/index.ts`
4. Add unit tests in `packages/core/tests/validator.test.ts`
5. If the rule needs the raw AST (not just the element model), use `workspace.documents` — see W004/W005 for examples

The `Rule` interface is ESLint-inspired: a self-describing `meta` object and a `check(workspace, index)` function. `arc42 rules` exposes the full registry to CLI users and agents.

### Key design decisions

- **Flat hierarchy with `parent:` references** — building-block decomposition is modelled as a flat list with parent pointers, not nested blocks. Simpler to parse, simpler for agents to write.
- **Parser stays dumb** — the parser emits all block types including unknown ones. The meta-model builder rejects unknowns with E005. This keeps the parser stable as new block types are added.
- **Same pipeline for all commands** — `validate`, `get`, and `rules` all run the full discover→parse→build→index pipeline. No caching in v1.
- **Rule registry** — each rule is a self-describing object. `arc42 rules` is a free by-product. Rules are composable and independently testable.
- **`Workspace.documents[]`** — structure-aware rules (W004, W005) need the raw AST to scan node sequences. The workspace carries the parsed documents for this purpose.

### This project's own architecture

`docs/arc42/` contains the arc42 documentation for arc42-language itself — quality goals, building blocks, concepts, and decisions, all written in the DSL this toolchain validates.

```bash
pnpm run validate:docs   # validate the project's own arc42 docs
pnpm run validate:all    # validate docs + examples
pnpm run validate:source # validate docs + examples using TypeScript source
```

### Setup

```bash
pnpm install
pnpm run build          # builds core + cli

# Install the pre-commit hook (validates arc42 workspaces from TypeScript source before every commit)
pnpm run hooks:install
```
