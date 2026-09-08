# Development Plan: arc42-language (feat/validate-interface-chapter-assignment branch)

*Generated on 2026-09-08 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

Enforce that typed arc42 elements are documented in the numbered chapter assigned to their
element kind. In particular, interface definitions belong in chapter 5 beneath their provider;
chapter 3 actors reference those interfaces through `requires`.

Update the project documentation, bookstore example, starter templates, and chapter guide to use
this convention.

## Key Decisions

1. **Generic assignment rule:** Validate every typed `Element` against
   `ELEMENT_CHAPTER[element.kind]`; do not special-case interfaces.
2. **Separate from W015:** W015 remains responsible only for validating numbered chapter h1
   titles. Chapter/element assignment gets its own rule and stable rule code.
3. **Severity:** A typed element in the wrong numbered chapter is an error because chapter
   assignment is a structural invariant.
4. **Filename scope:** Apply the rule only to files with a recognized numbered chapter prefix
   (`01-` through `12-`). Unnumbered documents remain valid for snippets and alternate layouts.
5. **Interface ownership:** Interface blocks are provider-owned definitions in chapter 5. Chapter
   3 contains actors, their `requires` references, and context diagrams, not interface blocks.
6. **W027 boundary:** Keep W027 focused on provider-subchapter structure in building-block
   documents. It should not be changed to police chapter assignment.
7. **Documentation placement:** Move the project and example interface blocks from chapter 3 to
   provider building-block sections in chapter 5. Keep consumer requirements in chapter 3 or on
   consuming building blocks.
8. **Shared filename parsing:** Keep numbered arc42 filename parsing in the shared path utility so
   W015 and E016 apply identical `.arc42.md` and `01`–`12` boundaries.

## Evidence and Findings

- `ELEMENT_CHAPTER` already assigns chapters to every typed element: constraints 2, actors 3,
  solution strategy 4, building blocks/interfaces 5, runtime scenarios 6, deployment nodes 7,
  concepts 8, decisions 9, quality goals/scenarios 10, risks 11, and glossary terms 12.
- The Zod schemas also expose matching `arc42Chapter` metadata.
- W015 currently validates only the first h1 title of numbered chapter files.
- W027 validates that interfaces in building-block documents are direct provider subchapters and
  intentionally does not constrain context-only documents.
- Commit `7191dca` replaced `interface.between` with `interface.provider` and consumer `requires`.
  Guide/template wording must preserve that model.
- The initial implementation attempt was stashed as
  `wip/interface-chapter-placement-exploration`; Markdown changes remain in the working tree.
  The stash contained a failed W027 test expectation and formatting failures, so it is only
  exploratory material and must be reconciled with these decisions during Plan/Code.

## Explore

### Completed

- Inspected the chapter guides, starter templates, project architecture chapters, and bookstore
  example.
- Inspected the element model, schemas, source locations, W015, W027, rule registry, and tests.
- Confirmed that all typed elements already have canonical chapter metadata.
- Confirmed the correct design is a new generic chapter/element assignment rule, separate from
  W015 and W027.
- Stashed the exploratory implementation changes, leaving Markdown documentation available for
  the next phase.

## Plan

No project requirements, architecture, or design document exists under `.vibe/docs/`; this plan is
the design record for the change.

### Design

- Add a new error rule, **E016**, named for generic element/chapter assignment rather than
  interfaces specifically. Register it with the built-in validator rules.
- Determine the source chapter from the document filename using the same numbered-file convention
  as W015. If no recognized chapter number is present, return no E016 diagnostics.
- For each parsed typed element in a numbered document, look up
  `ELEMENT_CHAPTER[element.kind]`. Emit one diagnostic when the expected chapter differs from the
  source chapter. The diagnostic should identify the element kind/id, actual chapter, and expected
  chapter.
- Use the element's parsed source location for diagnostic placement. Do not infer placement from
  headings, provider relationships, or interface-specific fields.
- Preserve W015 unchanged except for any independent test cleanup. Preserve W027's existing
  building-block-only scope and diagnostics.

### Rule and test matrix

The implementation and tests must cover:

1. An interface in chapter 3 produces E016 and expects chapter 5.
2. An interface beneath its provider in chapter 5 produces no E016 diagnostic.
3. At least one non-interface element verifies the rule is genuinely generic.
4. An element in its canonical chapter produces no diagnostic.
5. A numbered document containing multiple misplaced elements produces a diagnostic for each.
6. An unnumbered document produces no E016 diagnostic, even when it contains typed elements.
7. Chapter numbers at the supported boundaries (01 and 12) use the normal mapping.
8. W015 still reports incorrect chapter titles and does not become responsible for assignment.
9. W027 still ignores context-only documents and continues validating provider subchapters in
   building-block documents.

### Documentation strategy

- Remove interface definitions from chapter 3 project/example documents and retain actor
  requirements there.
- Add each interface beneath its owning provider in chapter 5, preserving IDs and references.
- Update starter chapter guidance and `arc42 guide chapter 3` so the ownership rule is explicit.
- Ensure no documentation reintroduces the removed `interface.between` relationship.

### Tasks

- [x] Define E016 as a generic error rule separate from W015 and W027.
- [x] Define filename scope, source-location behavior, diagnostic contents, and edge-case test
  matrix.
- [x] Implement E016, register it, and add the rule tests described above.
- [x] Reconcile the exploratory stash: restore W027 behavior, remove any interface-only draft,
  and keep W015 title-only.
- [x] Apply and review the documented chapter 3/chapter 5 moves and guide/template wording.
- [x] Run focused tests, formatting/checks, full tests, and chapter validation.

## Code

### Tasks

- [x] Add E016 rule implementation and registry metadata.
- [x] Add E016 and regression tests for W015/W027.
- [x] Update Markdown documentation and templates.
- [x] Verify diagnostics, formatting, and the complete test suite.
- [x] Incorporated review feedback by adding same-kind multi-element and chapter-boundary tests,
  and by making the W027 context-scope test exercise an existing provider.

## Commit

### Tasks

- [ ] Review the final diff and commit only when explicitly requested.
