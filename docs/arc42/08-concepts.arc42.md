# Cross-cutting Concepts

These concepts apply across multiple building blocks in the arc42-language toolchain.
They represent shared patterns and constraints that are enforced project-wide.

## Pipeline Pattern

All three CLI commands — `validate`, `get`, `rules` — run the same sequential pipeline:
discover files, parse, build model, index references, then act. There is no caching in v1.
This keeps the code simple and predictable: every invocation is a full, fresh pass over
the workspace. The cost is minor latency on large workspaces, which is acceptable for v1.

The pipeline is the primary integration contract between all core building blocks. No block
skips a stage or takes a shortcut.

```arc42
:::concept
id: concept-pipeline
title: Single-pass Pipeline
category: architecture
:::
```

## Prose-first Documentation

Every machine-readable element is introduced by prose in its own `##` section. This keeps the architecture useful in a Markdown viewer while allowing the parser and validator to index typed elements, references, and diagnostics.

```arc42
:::concept
id: concept-prose-first
title: Prose-first Documentation
category: authoring
:::
```

## Rule Registry Pattern

Validation rules are self-describing objects registered in a central index. Each rule carries
its own metadata — code, severity, type, description, rationale, and arc42 chapter — alongside
its `check()` function. The validator is a flat map over the registry. `arc42 rules` exposes
the registry directly to CLI users and agents.

This pattern is deliberately ESLint-inspired. It makes the rule set extensible (add a file,
register it), documentable (`arc42 rules --format json`), and independently testable (each
rule is a pure function with no shared state).

```arc42
:::concept
id: concept-rule-registry
title: Rule Registry Pattern
category: architecture
:::
```
