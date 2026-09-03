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

## No Runtime Dependencies

The core library and CLI must not require third-party packages at runtime. Dependencies used to
build and test the TypeScript packages remain development tooling rather than production runtime
inputs.

```arc42
:::constraint
id: con-no-runtime-dependencies
title: Core and CLI must use Node.js built-ins at runtime
category: technical
source: Architecture decision dec-runtime-builtins
:::
```

## Markdown DSL Convention

Architecture elements are authored as Markdown sections containing prose followed by one typed
`:::block`. The parser and structural rules depend on one heading and one block per element.

```arc42
:::constraint
id: con-markdown-authoring
title: Architecture elements must follow the prose-first Markdown DSL convention
category: convention
source: packages/skill/SKILL.md and validation rules W004/W005
:::
```
