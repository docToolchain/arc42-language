---
name: arc42-language
description: Use when working on this project's architecture — reading, writing, or validating *.arc42.md files. Trigger keywords: arc42, architecture, quality goal, solution strategy, building block, deployment node, actor, sequence diagram, concept, decision, ADR, constraint, risk, glossary.
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

| Block type          | Required fields             | Optional fields                      |
| ------------------- | --------------------------- | ------------------------------------ |
| `quality-goal`      | `id`, `title`, `priority`   | `scenario`                           |
| `constraint`        | `id`, `title`, `category`   | `source`                             |
| `actor`             | `id`, `title`, `type`       | `description`                        |
| `solution-strategy` | `id`, `title`               | `addresses`                          |
| `building-block`    | `id`, `title`               | `technology`, `parent`, `implements` |
| `interface`         | `id`, `title`, `between`    | `protocol`                           |
| `deployment-node`   | `id`, `title`               | `type`, `hosts`, `parent`            |
| `concept`           | `id`, `title`               | `category`                           |
| `decision`          | `id`, `title`, `status`     | `date`, `addresses`, `supersedes`    |
| `risk`              | `id`, `title`, `severity`   | `mitigation`                         |
| `glossary-term`     | `id`, `title`, `definition` | —                                    |

### Field value constraints

- `quality-goal.priority`: `high` | `medium` | `low`
- `constraint.category`: `technical` | `organizational` | `convention`
- `actor.type`: `person` | `system` — `person` for human roles (user, operator, team); `system` for external software systems or services
- `decision.status`: `proposed` | `accepted` | `deprecated` | `superseded`
- `decision.supersedes`: on the _new_ decision — points to the id of the decision it replaces
- `risk.severity`: `high` | `medium` | `low`
- `deployment-node.type`: `server` | `container` | `device` | `cloud-region` | `environment`

### Cross-reference fields

| Field        | On type             | References                                                                                |
| ------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| `parent`     | `building-block`    | another `building-block` id                                                               |
| `implements` | `building-block`    | one or more `concept` ids (comma-separated)                                               |
| `between`    | `interface`         | one `building-block` id and one `actor` id, or two `building-block` ids (comma-separated) |
| `addresses`  | `decision`          | one or more `quality-goal`, `constraint`, or `risk` ids                                   |
| `addresses`  | `solution-strategy` | one or more `quality-goal` ids                                                            |
| `supersedes` | `decision`          | another `decision` id                                                                     |
| `parent`     | `deployment-node`   | another `deployment-node` id                                                              |
| `hosts`      | `deployment-node`   | one or more `building-block` ids (comma-separated)                                        |

All referenced IDs must resolve to an existing element (rule E002). IDs are unique across the
entire workspace (all `*.arc42.md` files in the directory).

## Validation rules

Run `arc42 rules` to see the full list of rules with rationale. Use `--format json` for machine-readable output.

### Diagram convention

Diagrams are explicitly associated with a structured element or section using a `:::diagram`
metadata block. They provide a visual overview of the surrounding prose and blocks — they do not
replace or contradict the structured model, and they do not create additional model elements.

Place a diagram **immediately after the introductory prose of a section**, before the per-element
blocks, so readers get the overview before the detail. A chapter-level overview diagram goes near
the top of the chapter; a scoped diagram for one area goes in its own `##` section.

When a diagram identifier cannot match a model ID directly — for example, Mermaid sequence
diagrams forbid hyphens in participant names — declare an explicit alias in the `:::diagram`
metadata block using `aliases: diagram-id=model-id` (comma-separated for multiple). There is no
implicit normalization; undeclared identifiers that don't match a model ID produce E008.

The starter templates contain worked examples and notation-specific guidance in their HTML
comments. Follow the example in the relevant template when adding a diagram for the first time.

Fix all errors before committing. Warnings should be resolved before merging. Hints are
best-practice suggestions — address them when the context allows.

If you are unsure what a rule requires, run `arc42 rules` for the full rationale.
If you are unsure what already exists, run `arc42 get` or `arc42 get <id>`.

## Starter templates

`templates/starter/` contains ready-to-use files for each chapter. Each file is a blank
template with HTML comments (`<!-- ... -->`) explaining what to write and showing a DSL
block example. The comments are ignored by the parser and validator — they are authoring
guidance only, not part of the document.

To use a template:

1. Copy the relevant file(s) into your workspace directory
2. Read the HTML comment at the top of each file — it explains the arc42 intent for that chapter
3. Add `##` sections with your actual content, following the example in the comment
4. Remove the comment block once you no longer need the guidance
5. Run `arc42 validate` to confirm 0 errors

## Your responsibility

**Every architectural change must be reflected in the arc42 files.**
After any change to the system — adding a component, making a technology decision,
introducing a cross-cutting concern — update or add the relevant arc42 elements and
run `arc42 validate` to confirm 0 errors.
