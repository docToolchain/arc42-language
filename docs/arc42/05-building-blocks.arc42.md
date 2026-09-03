# Building Blocks

The arc42-language toolchain is a pnpm monorepo. Each package is a vertical slice of the system —
the core library owns all logic; the CLI and skill are thin consumers of it.

## Core Library

The heart of the system. Implements the full pipeline from file discovery to validation output.
Has no runtime dependencies beyond Node.js built-ins. All other packages import from here.
The pipeline is: discover files → parse Markdown → build element model → index references → validate.

:::building-block
id: bb-core
title: Core Library
technology: TypeScript / Node.js
implements: concept-pipeline, concept-rule-registry
:::

## Markdown Parser

Reads `.arc42.md` files line by line and produces a `DocumentAst` — a sequence of heading,
prose, and block nodes with line numbers. Deliberately dumb: it emits all block types including
unknown ones. The meta-model builder rejects what it does not understand. This keeps the parser
stable as the block type set evolves.

:::building-block
id: bb-parser
title: Markdown Parser
technology: TypeScript
parent: bb-core
implements: concept-pipeline
:::

## Meta-model Builder

Turns `DocumentAst[]` into a typed `Workspace` — a flat list of `Element` objects covering quality
goals, constraints, building blocks, interfaces, concepts, decisions, risks, and glossary terms,
plus parse errors for missing or invalid required attributes. Unknown block types and structural
problems are recorded as `ParseError` entries, which the E005 rule surfaces as diagnostics.

:::building-block
id: bb-builder
title: Meta-model Builder
technology: TypeScript
parent: bb-core
implements: concept-pipeline
:::

## Reference Resolver

Builds a bidirectional reference index from the workspace: `byId` (id → element), `refsFrom`
(id → ids this element references), `refsTo` (id → ids that reference this element). The index
is passed to every validation rule and to the `get` command for 1-hop relationship resolution.

:::building-block
id: bb-resolver
title: Reference Resolver
technology: TypeScript
parent: bb-core
implements: concept-pipeline
:::

## Validator

Runs all registered rules against the workspace and index. Each rule is a self-describing object
with metadata (code, severity, type, description, rationale, arc42 chapter) and a `check()` function.
The validator is simply `builtinRules.flatMap(r => r.check(workspace, index))`. Rules that need
raw AST access use `workspace.documents`.

:::building-block
id: bb-validator
title: Validator
technology: TypeScript
parent: bb-core
implements: concept-pipeline, concept-rule-registry
:::

## Renderer Registry

Produces human-readable text or JSON from workspace and element query results. Each renderer
implements the `GetRenderer` interface. The registry (`builtinGetRenderers`, `rendererById`)
mirrors the rule registry pattern. Text and JSON are the two built-in formats; graphviz and
HTML are future work.

:::building-block
id: bb-renderer
title: Renderer Registry
technology: TypeScript
parent: bb-core
implements: concept-rule-registry
:::

## CLI

A thin entry point over the core library. Parses arguments with Node.js `util.parseArgs`
(no third-party parser), resolves the workspace directory (`--dir` flag → `$ARC42_DIR` → cwd),
and delegates to `validateWorkspace` or `getElements` from core. Implements three commands:
`validate`, `get`, `rules`.

:::building-block
id: bb-cli
title: CLI
technology: TypeScript / Node.js
implements: concept-pipeline
:::

## Opencode Skill

A single `SKILL.md` file that orients AI agents to the project's arc42 convention. Not code —
it establishes the expectation that every architectural change is reflected in the arc42 files,
and points agents at the CLI to discover current state and rules. Installed by copying to
`~/.opencode/skills/arc42-language/SKILL.md`.

:::building-block
id: bb-skill
title: Opencode Skill
technology: Markdown
implements: concept-prose-first
:::

## Skill → Agent Runtime Interface

The skill is installed into the agent's skill directory by file copy. At runtime the agent
reads the SKILL.md and uses the `arc42` CLI via Bash tool calls. This interface is
conceptual — there is no code-level dependency — but it is the primary integration point
between the toolchain and AI agents.

:::interface
id: if-skill-cli
title: Skill → CLI (via agent)
between: bb-skill, bb-cli
protocol: Bash tool call (arc42 commands)
:::

## Core → CLI Interface

The CLI imports the top-level API from the core library as a workspace dependency.
All business logic lives in core; the CLI only handles argument parsing, output formatting,
and exit codes.

:::interface
id: if-core-cli
title: Core → CLI
between: bb-core, bb-cli
protocol: TypeScript module import (pnpm workspace:\*)
:::

## Parser → Builder Interface

The parser produces `DocumentAst` structs consumed by the builder to construct the workspace model.

:::interface
id: if-parser-builder
title: Parser → Builder
between: bb-parser, bb-builder
protocol: In-process TypeScript function call
:::

## Builder → Resolver Interface

The builder produces a `Workspace`; the resolver consumes it to build the reference index.

:::interface
id: if-builder-resolver
title: Builder → Resolver
between: bb-builder, bb-resolver
protocol: In-process TypeScript function call
:::

## Resolver → Validator Interface

The validator receives both the workspace and the reference index from the resolver.

:::interface
id: if-resolver-validator
title: Resolver → Validator
between: bb-resolver, bb-validator
protocol: In-process TypeScript function call
:::

## Validator → Renderer Interface

The CLI passes validation results and element queries to the renderer registry for output.

:::interface
id: if-validator-renderer
title: Validator → Renderer
between: bb-validator, bb-renderer
protocol: In-process TypeScript function call
:::

## arc42 Documentation Workspace

The set of `.arc42.md` files that make up a project's architecture documentation.
Written by architects and AI agents, read by architects, the CLI, and CI pipelines.
The CLI discovers, parses, and validates these files — they are both the input to the
toolchain and the primary human-readable output it produces and maintains.

:::building-block
id: bb-workspace
title: arc42 Documentation Workspace
technology: Markdown (.arc42.md files)
implements: concept-prose-first, concept-pipeline
:::

## CLI → Documentation Workspace Interface

The CLI reads `.arc42.md` files from the workspace directory on every `validate` or
`get` invocation. It does not write to them — that is the responsibility of the
architect or AI agent.

:::interface
id: if-cli-workspace
title: CLI → Documentation Workspace
between: bb-cli, bb-workspace
protocol: File system read (glob + parse)
:::
