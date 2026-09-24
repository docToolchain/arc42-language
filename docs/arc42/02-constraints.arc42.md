# Architecture Constraints

The implementation is intentionally constrained by its runtime environment, authoring format,
and repository conventions. These constraints limit design choices and are addressed by the
decisions in chapter 9.

## Node.js Runtime

The packages target Node.js 20 or newer. This permits the implementation to use current platform
APIs and means older Node.js runtimes are outside the supported deployment environment.

```arc42
:::constraint
id: con-node-runtime
title: Runtime must be Node.js 20 or newer
category: technical
source: package.json engines field
:::
```

## No Runtime Dependencies in Core and CLI

The core library and CLI must not require third-party packages at runtime. Dependencies used to
build and test the TypeScript packages remain development tooling rather than production runtime
inputs. Third-party runtime dependencies in other packages — such as `asciidoctor` in
`workspace-fs` — must be explicitly accepted as tracked technical debt (see `dec-zod-runtime-debt`
for the established pattern).

```arc42
:::constraint
id: con-no-runtime-dependencies
title: Core and CLI must use Node.js built-ins at runtime
category: technical
source: Architecture decision dec-runtime-builtins
:::
```

## Browser Bundle Safety

Packages imported by the web SPA (`@arc42/web`) must not transitively pull in Node.js-only
dependencies. Heavy server-side dependencies such as `asciidoctor` must remain confined to
`@arc42/workspace-fs` and never appear in any import path reachable from the browser bundle.
Vite tree-shaking cannot remove a module that is statically imported — the package boundary is
the only safe isolation mechanism.

```arc42
:::constraint
id: con-browser-bundle-safety
title: Web SPA must not bundle Node.js-only dependencies
category: technical
source: Architecture decision dec-asciidoc-in-workspace-fs
:::
```

## Prose-first DSL Convention

Architecture elements are authored as sections containing prose followed by one typed
`:::block`. The parser and structural rules depend on one heading and one block per element.
This convention applies regardless of the notation format used (Markdown or AsciiDoc).

```arc42
:::constraint
id: con-prose-first-authoring
title: Architecture elements must follow the prose-first DSL convention
category: convention
source: packages/skill/SKILL.md and validation rules W004/W005
:::
```
