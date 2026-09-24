# Architecture Decisions

Key decisions made during the design and implementation of the arc42-language toolchain.
Each decision is linked to the quality goals it serves via `addresses:`.

## Machine-readable Architecture Without Sacrificing Human Readability

The primary goal of arc42-language is to make architecture documentation machine-readable
for tooling and AI agents — while keeping it fully readable and writable by humans without
special tooling. This rules out pure YAML/JSON (not human-readable prose), XML-based formats
(too verbose), and embedded code annotations (tied to one language). Markdown was the
natural host format: ubiquitous, renderable everywhere, and familiar to developers and agents
alike. The `:::type` fenced block syntax adds structured data as a lightweight extension that
does not break standard Markdown renderers.

```arc42
:::decision
id: dec-primary-goal
title: Machine-readable architecture as an extension of human-readable Markdown
status: accepted
date: 2026-08-14
addresses: qg-readability, qg-agent-writability
:::
```

## Monorepo to Ship One Source of Truth to Multiple Audiences

The toolchain is split into `@arc42/core` (parser, model, validator, renderer),
`@arc42/cli` (human-facing command-line tool), and `@arc42/skill` (agent-facing skill and
templates) — all in one monorepo. This structure lets a single source of truth produce
artefacts for three distinct audiences: agents consuming the skill and templates, humans
using the CLI, and documentation consumers reading the rendered output. A separate-repo
approach would require synchronising the model across repos and risk the skill diverging
from the validator.

```arc42
:::decision
id: dec-monorepo
title: Use a monorepo to deliver tooling for agents, humans, and documentation from one truth
status: accepted
date: 2026-08-14
addresses: qg-extensibility, qg-agent-writability, qg-verifiability
:::
```

## Markdown-flavored DSL with :::type fences

We evaluated pure YAML/JSON, AsciiDoc delimited blocks, MDX (JSX in Markdown), and
`:::type` fenced div syntax (MyST/Pandoc). YAML/JSON is not human-readable prose. MDX
requires a JSX parser and is too complex for agents to generate reliably. AsciiDoc is a
different ecosystem entirely. `:::type` fences are the lightest Markdown extension: simple
delimiters, no nested complexity, compatible with standard renderers that pass through
unknown divs, and friendly to line-oriented parsers. Crucially, the same syntax can be
adopted in AsciiDoc or other host formats in the future without changing the DSL semantics.

```arc42
:::decision
id: dec-markdown-dsl
title: Use Markdown with :::type fenced blocks as the DSL format
status: accepted
date: 2026-08-14
addresses: qg-readability, qg-agent-writability, qg-extensibility
:::
```

## Line-oriented parser, not tree-sitter

Tree-sitter produces an incremental, structured AST and would enable richer editor
features later. However, there is no canonical `tree-sitter-markdown` grammar; the
Markdown+`:::block` hybrid would require maintaining two grammar rule sets. A simple
line-oriented parser — scan for `:::type` fences, parse key-value pairs inside — covers
all v1 needs with zero grammar maintenance. Tree-sitter can be added later as an
optimisation, not a requirement.

```arc42
:::decision
id: dec-line-parser
title: Use a line-oriented parser rather than tree-sitter for v1
status: accepted
date: 2026-08-14
addresses: qg-extensibility, qg-agent-writability
:::
```

## Flat hierarchy with parent: references

Building-block decomposition is expressed as a flat list of elements with `parent:` pointers,
not nested `:::building-block` blocks inside other blocks. Nested syntax requires depth tracking
in the parser and is error-prone for agents to produce. A flat list with explicit parent ids
is simpler to parse, simpler to write, and the validator can reconstruct the tree and detect
cycles. The trade-off is that the file is slightly less visually hierarchical.

```arc42
:::decision
id: dec-flat-hierarchy
title: Model building-block hierarchy as flat list with parent references
status: accepted
date: 2026-08-14
addresses: qg-agent-writability, qg-extensibility
:::
```

## No third-party runtime dependencies

The original v1 target was a runtime made only of Node.js built-ins. The core model schemas now
use Zod at runtime, so that target is superseded rather than silently claimed as true. Removing
Zod would require replacing the schema system and is tracked as technical debt.

```arc42
:::decision
id: dec-no-deps
title: Use only Node.js built-ins at runtime — no third-party packages
status: superseded
date: 2026-08-14
addresses: qg-cli-usability, qg-extensibility
:::
```

## Accept Zod as tracked core runtime technical debt

Zod remains a deliberate runtime dependency of `@arc42/core` because the model schema definitions
currently provide the parser/builder validation boundary. This is accepted technical debt, not a
general policy that core may accumulate dependencies: replacing it requires an explicit schema
validation redesign and separate scope.

```arc42
:::decision
id: dec-zod-runtime-debt
title: Accept Zod as a tracked runtime dependency in core
status: accepted
date: 2026-09-08
supersedes: dec-no-deps
addresses: qg-extensibility, risk-runtime-dependency
:::
```

## Shared processing pipeline for commands, no caching

Each filesystem-backed command acquires and parses its workspace from scratch before invoking the
core processing pipeline. `validate` additionally runs validation; `get` builds query views, while
`rules` reads static rule metadata. We considered caching the parsed workspace on disk or in memory,
but the added complexity (cache invalidation, stale state, file watching) is not justified for v1
workspace sizes. The pipeline is fast enough (sub-100ms for typical workspaces) that cold-start on
every invocation is acceptable.

```arc42
:::decision
id: dec-no-cache
title: Run the full pipeline on every invocation — no caching in v1
status: accepted
date: 2026-08-14
addresses: qg-verifiability, qg-extensibility
:::
```

## Rule registry with rationale

Validation rules are self-describing objects with metadata including a `rationale` field —
a plain-English explanation of why the rule exists. This makes the rule set understandable
without reading the source code. `arc42 rules` exposes the full registry to CLI users and
agents. The ESLint-inspired structure (meta + check function) makes rules independently
testable and the registry extensible without touching the validator core.

```arc42
:::decision
id: dec-rule-registry
title: Implement rules as self-describing objects with rationale in a central registry
status: accepted
date: 2026-08-14
addresses: qg-extensibility, qg-verifiability, qg-agent-writability
:::
```

## Prose-first authoring convention enforced by rules

The DSL enforces a structural convention: every element lives in its own `##` section,
with prose explaining purpose and rationale before the `:::block`. Two validation rules
(W004, W005) catch violations. This is not arbitrary style — it ensures the documentation
is useful to human readers, not just a machine-readable index. An architecture document
where every block is naked metadata has failed at its primary purpose.

```arc42
:::decision
id: dec-prose-first
title: Enforce prose-first authoring convention with W004 and W005 rules
status: accepted
date: 2026-08-17
addresses: qg-readability, qg-verifiability, con-prose-first-authoring
:::
```

## Runtime Without Production Dependencies

The core library and CLI use Node.js built-ins at runtime. The project accepts the resulting dependency constraints because a small, locked-down toolchain is easier to install and audit.

```arc42
:::decision
id: dec-runtime-builtins
title: Use Node.js built-ins for runtime functionality
status: accepted
date: 2026-08-14
addresses: qg-cli-usability, qg-extensibility, con-node-runtime, con-no-runtime-dependencies
:::
```

## Focused v1 Element Model

The v1 model covers the arc42 sections that can be represented as typed, cross-referenceable elements. Diagram-heavy context, runtime, deployment, and solution views remain prose-only until the AST supports richer graph structures.

```arc42
:::decision
id: dec-focused-v1-model
title: Keep the v1 element model focused on typed cross-referenceable content
status: accepted
date: 2026-08-18
addresses: qg-agent-writability, qg-extensibility, risk-unmodeled-views
:::
```

## Starter Templates as Authoring Guidance

The starter files provide complete examples for every supported block type and use the same one-heading-per-element convention as the project documentation. They are intentionally neutral so agents can copy the structure without copying domain-specific architecture.

```arc42
:::decision
id: dec-starter-templates
title: Maintain neutral starter templates for supported arc42 chapters
status: accepted
date: 2026-08-18
addresses: qg-agent-writability, qg-readability, risk-template-drift
:::
```

## NotationAdapter to Encapsulate Notation-specific Behavior

As AsciiDoc support was added alongside Markdown, the codebase required changes in ~10 places
that assumed Markdown — file extension checks, parser selection, fence descriptions in validator
messages, chapter filename generation, and prose rendering. Rather than scattering `if notation
=== "asciidoc"` branches throughout the codebase, all notation-specific behavior is encapsulated
behind a `NotationAdapter` interface. The adapter is selected once at workspace discovery time
and flows through the processing pipeline as a single object. This makes adding a third notation
a matter of implementing two interfaces and registering one adapter.

```arc42
:::decision
id: dec-notation-adapter
title: Encapsulate all notation-specific behavior behind NotationAdapter interface
status: accepted
date: 2026-09-24
addresses: qg-extensibility, qg-agent-writability
:::
```

## ProseRenderer as Post-parse Step Populating renderedHtml

The web SPA previously called `marked.parse()` at render time on every `ProseNode.text`. Adding
AsciiDoc required a symmetric approach: `asciidoctor.convert()` for AsciiDoc prose. Rather than
branching in the SPA (which would require Asciidoctor.js in the browser bundle), a `ProseRenderer`
interface runs as a post-parse step on the server side and populates `ProseNode.renderedHtml`.
`ProseNode.text` always retains raw source — non-rendering consumers (diff, builder, validators)
are unaffected. The SPA uses `renderedHtml` directly, with no notation logic and no `marked` dependency.

```arc42
:::decision
id: dec-prose-renderer
title: ProseRenderer post-parse step populates ProseNode.renderedHtml; text stays raw source
status: accepted
date: 2026-09-24
addresses: qg-extensibility, qg-readability, con-browser-bundle-safety
:::
```

## AsciiDoc Implementations Confined to workspace-fs

The `asciidoctor` npm package (~1.5 MB) is required for AsciiDoc prose rendering but must not
enter the browser bundle. `@arc42/core` is browser-safe (zero `node:` imports) and must remain so.
The `AsciidocProseRenderer` and `AsciidocNotationAdapter` therefore live in `@arc42/workspace-fs`,
which is Node.js-only. Core exports only the interfaces and Markdown implementations. A separate
`@arc42/workspace-asciidoc` package was considered but rejected: the CLI and server both depend
on `workspace-fs` already, and a new package would add indirection without a clear consumer benefit.

```arc42
:::decision
id: dec-asciidoc-in-workspace-fs
title: AsciiDoc adapter and asciidoctor dependency confined to workspace-fs
status: accepted
date: 2026-09-24
addresses: qg-extensibility, con-browser-bundle-safety
:::
```

## @arc42/core/types Subpath Export Replaces Hand-maintained Web Mirror

The web SPA previously maintained `web/src/types.ts` as a hand-written mirror of the types in
`@arc42/core`. This caused drift risk and double-maintenance on every type change. `@arc42/core`
has zero `node:` imports and is browser-safe, but its barrel export (`@arc42/core`) mixes runtime
functions with type exports. A dedicated `./types` subpath export (`core/src/types-export.ts`)
contains only `export type` re-exports — an explicit browser-safe contract. The web imports
from `@arc42/core/types`; `web/src/types.ts` is deleted.

```arc42
:::decision
id: dec-core-types-subpath
title: @arc42/core/types subpath export as browser-safe type contract; eliminates web mirror
status: accepted
date: 2026-09-24
addresses: qg-extensibility, qg-agent-writability, con-browser-bundle-safety
:::
```

## Extension-based Notation Detection; Mixed Workspace is an Error

The notation used by a workspace is inferred from the file extensions found during `discoverFiles()`:
all `.arc42.md` → Markdown; all `.arc42.adoc` → AsciiDoc; mixed → error with a clear message.
No config file is needed. This keeps authoring zero-config and surfaces accidental mixing early.
The detected notation flows as a `NotationAdapter` through the pipeline and as a `notation` string
on `WorkspacePayload` for the SPA.

```arc42
:::decision
id: dec-notation-detection
title: Notation inferred from file extensions at discovery; mixed workspace is an error
status: accepted
date: 2026-09-24
addresses: qg-cli-usability, qg-agent-writability, qg-verifiability
:::
```

## Semantic Diff Instead of Line Ranges

The first `arc42 diff` mapped git hunks to line ranges: a block counted as changed when a hunk
touched its lines, and its prose counted as changed when a hunk touched its section. That flagged
formatting-only edits, misattributed sections appended after a block, and could not say what
actually changed. The diff now compares the parsed base and head models — elements by id,
relations by source, type and target, prose by the normalized text of its section — and the
consistency lint is derived from that comparison. The same result feeds change visualization.
Renamed ids and headings are deliberately a removal plus an addition, and snapshots that cannot be
interpreted unambiguously (duplicate ids, blocks outside a heading) are rejected rather than
guessed at.

```arc42
:::decision
id: dec-semantic-diff
title: Compare architecture models instead of changed lines for arc42 diff
status: accepted
date: 2026-09-24
addresses: qg-verifiability, qg-readability, con-prose-first-authoring
:::
```
