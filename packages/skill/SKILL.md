---
name: arc42-language
description: Use when working on this project's architecture — reading, writing, or validating *.arc42.md files. Trigger keywords: arc42, architecture, quality goal, building block, concept, decision, ADR.
allowed-tools: Bash(arc42:*)
---

# arc42 Language

This project documents its architecture in the arc42 DSL — Markdown files with typed `:::block` fences
for structured elements. The format is human-readable first: prose explains intent, the block records
the machine-readable summary. The CLI validates consistency and coherence across all elements.

## Getting started

Before making architectural changes, familiarise yourself with the current state:

```bash
arc42 validate          # check consistency — fix all errors before proceeding
arc42 get               # browse all elements
arc42 rules             # understand what the validator enforces and why
```

`--dir <path>` scopes to a specific workspace. Defaults to `$ARC42_DIR` or cwd.

## Authoring convention

Each element lives in its own `##` section: heading, then prose explaining purpose and rationale,
then the `:::block` as the machine-readable summary at the end of the section.

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

## Your responsibility

**Every architectural change must be reflected in the arc42 files.**
After any change to the system — adding a component, making a technology decision,
introducing a cross-cutting concern — update or add the relevant arc42 elements and
run `arc42 validate` to confirm 0 errors.

If you are unsure what a rule requires, run `arc42 rules` for the full rationale.
If you are unsure what already exists, run `arc42 get` or `arc42 get <id>`.
