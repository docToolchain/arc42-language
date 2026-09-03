# @doc-tc/arc42

A CLI for validating and querying arc42 software architecture documentation written in the arc42 DSL — Markdown prose with typed `:::block` fences for structured metadata.

## Install

```bash
npm install -g @doc-tc/arc42
```

Or run without installing:

```bash
npx @doc-tc/arc42 <command>
```

## Getting started

Scaffold starter templates into your workspace:

```bash
arc42 init template --dir ./docs
```

Install the agent skill (for opencode and compatible AI agents):

```bash
arc42 init skill
```

## Commands

```bash
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

## `arc42 init`

```bash
arc42 init template [--dir <path>]   # copies all 12 chapter templates; skips existing files
arc42 init skill [--path <dest>]     # writes SKILL.md to .agents/skills/arc42/SKILL.md
```

## Validation rules

Run `arc42 rules` to see each rule with its rationale. The short summary:

- **Errors** — duplicate ids, unresolved references, circular parent chains, interface pointing at non-building-blocks, missing required attributes
- **Warnings** — orphaned concepts, isolated building-blocks, stale proposed decisions, blocks without prose, multiple blocks under one heading
- **Hints** — decisions or solution strategies without quality-goal links, quality goals without decisions or a solution strategy, building-blocks without a technology

## The format

Each element lives in its own `##` section: heading, prose explaining purpose and rationale, then a typed block as the machine-readable summary.

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

See the [bookstore example](https://github.com/oliverjaegle/arc42-language/tree/main/examples/bookstore-backend) for a complete, valid workspace with realistic prose.

## License

MIT
