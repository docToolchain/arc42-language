# Solution Strategy

The architecture is organized around one human-readable, agent-writable documentation pipeline with
change-aware review:
Markdown prose carries the architectural narrative, typed blocks capture the facts that need
verification, and a shared core turns those facts into diagnostics and queries. The strategy is
deliberately small and composable so the same model serves authors, agents, CI, and future editor
integrations.

```arc42
:::solution-strategy
id: strategy-arc42-language
title: Human-readable, verifiable, change-aware architecture documentation
addresses: qg-readability, qg-agent-writability, qg-verifiability, qg-extensibility, qg-cli-usability
:::
```

## Focused Package Boundaries

The toolchain is organized as a monorepo of focused packages: `@arc42/core`, `@arc42/cli`, and
`@arc42/skill`. Core owns the parser, document model, reference graph, validation, and rendering;
the CLI provides the executable interface for humans, agents, and CI; and the skill gives agents
the architecture guidance they need. This keeps consumers thin and preserves one source of truth
for the language semantics.

## Human-readable DSL

The DSL is plain Markdown with typed `:::block` fences. Human readability comes first: people can
read the architecture in any Markdown viewer, while the typed fences provide the machine-readable
structure needed for parsing, querying, and validation. Prose remains outside the blocks rather
than being duplicated in attributes. Most chapters use one heading, prose, and one block per
element; chapter 4 is intentionally a single architecture-wide strategy with prose subsections.

## Shared Language Engine

The language-independent parts of the pipeline come from `@cli42/lib`
([cli42](https://github.com/mrsimpson/cli42)), shared with biz42, the business-model sibling of
this toolchain: the Markdown notation's parser, schema tools and model builder, the reference index
derived from the schemas' cross-references, the validation engine with its structural rules, the
Mermaid syntax boundary, authoring guidance, the semantic diff and its view, and Git snapshots and
history. `@arc42/core` declares what makes the language arc42 — its schemas, diagram kinds, rules,
AsciiDoc notation and code coverage — and keeps its public API; the CLI bundles the library, so it
adds no runtime dependency.

## Registry-based Validation

Validation follows an ESLint-inspired registry of rules. Each rule describes itself through
`meta.docs`, declares its severity, and provides a `check()` function. The pipeline is deliberately
linear — discover, parse, build, index, validate, render — and the parser remains open-ended while
the builder owns the typed model. This keeps validation discoverable and makes additional rules and
block types possible without changing the validation engine.

## Agent-driven Consistency

The agent skill is the primary consumer of the toolchain. It reads the architecture documentation,
uses the CLI to validate and query changes, and enforces consistency through pre-commit validation.
Stable IDs and bidirectional references make the model navigable, while errors, warnings, and hints
make gaps visible without preventing intentionally incomplete drafts. This workflow makes
architecture part of the normal code-change loop rather than a separate activity.
