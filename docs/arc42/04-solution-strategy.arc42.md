# Solution Strategy

## Focused Package Boundaries

The toolchain is organized as a monorepo of focused packages: `@arc42/core`, `@arc42/cli`, and
`@arc42/skill`. Each package has a clear boundary. Core owns the document model and validation,
the CLI provides the executable interface, and the skill gives agents the architecture guidance
they need.

## Human-readable DSL

The DSL is plain Markdown with typed `:::block` fences. Human readability comes first: people can
read the architecture in any Markdown viewer, while the typed fences provide the machine-readable
structure needed for parsing, querying, and validation.

## Registry-based Validation

Validation follows an ESLint-inspired registry of rules. Each rule describes itself through
`meta.docs`, declares its severity, and provides a `check()` function. This keeps validation
discoverable and makes additional rules possible without changing the validation engine.

## Agent-driven Consistency

The agent skill is the primary consumer of the toolchain. It reads the architecture documentation,
uses the CLI to validate changes, and enforces consistency through pre-commit validation. This
workflow makes architecture part of the normal code-change loop rather than a separate activity.
