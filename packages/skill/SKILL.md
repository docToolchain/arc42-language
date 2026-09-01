---
name: arc42-language
description: Use when working on this project's architecture — reading, writing, or validating *.arc42.md files. Trigger keywords: arc42, architecture, quality goal, building block, concept, decision, ADR, constraint, risk, glossary.
allowed-tools: Bash(arc42:*)
---

# arc42 Language

This project documents its architecture in the arc42 DSL — Markdown files with typed `:::block`
fences for structured elements. The format is human-readable first: prose explains intent, the
block records the machine-readable summary. The CLI validates consistency and coherence across
all elements.

## Getting started

Before making architectural changes, familiarise yourself with the current state:

```bash
arc42 validate          # check consistency — fix all errors before proceeding
arc42 get               # browse all elements
arc42 rules             # understand what the validator enforces and why
```

`--dir <path>` scopes to a specific workspace. Defaults to `$ARC42_DIR` or cwd.

## Authoring convention

Each element lives in its own `##` section: one heading → one prose paragraph explaining purpose
and rationale → one `:::block` as the machine-readable summary at the end of the section.
**Never put two blocks under the same `##` heading.** Prose without a block is valid (for
sections that do not need a machine-readable record).

Example:

```markdown
## Catalog Service

Owns all product data. The only service that writes to the catalog database.
Search results are cached to meet the p95 latency target.

:::building-block
id: bb-catalog-service
title: Catalog Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::
```

## Block type reference

| Block type | Arc42 chapter | Required fields | Optional fields |
|------------|--------------|-----------------|-----------------|
| `quality-goal` | 1 | `id`, `title`, `priority` | `scenario` |
| `constraint` | 2 | `id`, `title`, `category` | `source` |
| `building-block` | 5 | `id`, `title` | `technology`, `parent`, `implements` |
| `interface` | 5 | `id`, `title`, `between` | `protocol` |
| `concept` | 8 | `id`, `title` | `category` |
| `decision` | 9 | `id`, `title`, `status` | `date`, `addresses`, `supersedes` |
| `risk` | 11 | `id`, `title`, `severity` | `mitigation` |
| `glossary-term` | 12 | `id`, `title`, `definition` | — |

### Field value constraints

- `quality-goal.priority`: `high` | `medium` | `low`
- `constraint.category`: `technical` | `organizational` | `convention`
- `decision.status`: `proposed` | `accepted` | `deprecated` | `superseded`
- `risk.severity`: `high` | `medium` | `low`
- `decision.supersedes`: on the *new* decision — points to the id of the decision it replaces; E006 checks that the referenced decision has `status: superseded`

### Cross-reference fields

| Field | On type | References |
|-------|---------|------------|
| `parent` | `building-block` | another `building-block` id |
| `implements` | `building-block` | one or more `concept` ids (comma-separated) |
| `between` | `interface` | exactly two `building-block` ids (comma-separated) |
| `addresses` | `decision` | one or more `quality-goal`, `constraint`, or `risk` ids |
| `supersedes` | `decision` | another `decision` id |

All referenced IDs must resolve to an existing element (rule E002). IDs are unique across the
entire workspace (all `*.arc42.md` files in the directory).

## Validation rules summary

### Errors (E) — fix before committing

| Code | What it checks |
|------|---------------|
| E001 | Duplicate element id |
| E002 | Unresolved cross-reference |
| E003 | Circular parent chain in building blocks |
| E004 | Interface `between` references a non-building-block id |
| E005 | Parse error (unknown block type, missing required field, invalid enum value) |
| E006 | Decision carries `supersedes` but the referenced decision does not have `status: superseded` |

### Warnings (W) — should fix

| Code | What it checks |
|------|---------------|
| W001 | Concept has no building block implementing it |
| W002 | Leaf building block (with a parent) is isolated (no interfaces in or out) |
| W003 | Decision has been `proposed` for more than 90 days |
| W004 | Block has no prose paragraph above it |
| W005 | Multiple blocks under the same `##` heading |
| W006 | Fewer than 3 quality goals (arc42 recommends 3–5) |
| W007 | More than 5 quality goals (arc42 recommends 3–5) |
| W008 | Decision has no `date` field |
| W009 | Risk has no `mitigation` field |

### Hints (H) — best-practice suggestions

| Code | What it checks |
|------|---------------|
| H001 | Decision has no `addresses` field |
| H002 | Quality goal is not addressed by any decision |
| H003 | Building block has no `technology` field |
| H004 | Root building block is not referenced by any interface (workspace-level; leaf blocks checked by W002) |
| H005 | Workspace-level: workspace has concepts but no building block uses `implements` at all |
| H006 | Constraint is not addressed by any decision |
| H007 | Risk is not addressed by any decision |

## Starter templates

`templates/starter/` contains ready-to-use files for each chapter:

| File | Chapter |
|------|---------|
| `01-quality-goals.arc42.md` | Chapter 1 — Quality Goals |
| `02-constraints.arc42.md` | Chapter 2 — Constraints |
| `05-building-blocks.arc42.md` | Chapter 5 — Building Blocks + Interfaces |
| `08-concepts.arc42.md` | Chapter 8 — Cross-cutting Concepts |
| `09-decisions.arc42.md` | Chapter 9 — Architecture Decisions |
| `11-risks.arc42.md` | Chapter 11 — Risks and Technical Debt |
| `12-glossary.arc42.md` | Chapter 12 — Glossary |

Copy the relevant files into your workspace directory, replace placeholder content with your
system's specifics, and run `arc42 validate` to confirm 0 errors.

## Your responsibility

**Every architectural change must be reflected in the arc42 files.**
After any change to the system — adding a component, making a technology decision,
introducing a cross-cutting concern — update or add the relevant arc42 elements and
run `arc42 validate` to confirm 0 errors.

If you are unsure what a rule requires, run `arc42 rules` for the full rationale.
If you are unsure what already exists, run `arc42 get` or `arc42 get <id>`.
