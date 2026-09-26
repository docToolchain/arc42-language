# Risks and Technical Debt

The current implementation is deliberately small and leaves several areas for future work. The
risks below are documented with their current mitigation and the decision that addresses each one.

## Diagram-heavy Arc42 Views Are Not Typed

Arc42 sections 3, 4, 6, and 7 are not represented by dedicated DSL blocks. Their diagrams and
runtime or deployment relationships therefore cannot yet be validated or queried as structured
elements.

```arc42
:::risk
id: risk-unmodeled-views
title: Diagram-heavy arc42 views are not represented in the typed model
severity: medium
mitigation: Keep those views explicitly documented as open questions and design richer AST graph nodes before adding new block types.
:::
```

## Starter Template Drift

The starter templates, SKILL.md, and validator evolve together. If one is updated without the
others, agents may generate obsolete fields or documents that no longer validate.

```arc42
:::risk
id: risk-template-drift
title: Starter templates and authoring guidance may drift from the implementation
severity: low
mitigation: Validate templates and the project documentation after DSL changes, and update SKILL.md with the block reference and rule summary.
:::
```

## Earlier Versions of AsciiDoc Workspaces

The browser parses earlier versions with the Core Library, but the AsciiDoc prose renderer needs
`asciidoctor`, which stays out of browser-reachable code. Until this is decided, earlier versions
open only for Markdown workspaces; an AsciiDoc workspace gets a clear error instead.

```arc42
:::risk
id: risk-asciidoc-snapshots
title: Earlier versions of AsciiDoc workspaces cannot be opened in the browser
severity: low
mitigation: Show a clear error for AsciiDoc workspaces; decide between loading asciidoctor on demand for AsciiDoc workspaces only and preparing their models at build time.
:::
```

## Zod Runtime Dependency

The core package currently depends on Zod at runtime for model schema validation. Replacing it
would require a deliberate schema-validation redesign; the dependency is accepted and tracked
instead of being hidden by the pure-core boundary.

```arc42
:::risk
id: risk-runtime-dependency
title: Core runtime retains a Zod dependency
severity: low
mitigation: Keep Zod explicit in the core package and revisit removal only as a separately scoped schema-validation change.
:::
```
