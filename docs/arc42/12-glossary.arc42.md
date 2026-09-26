# Glossary

These terms have precise meanings in the implementation and are used throughout the architecture
documentation.

## Architecture Decision Record

An ADR records a significant architecture choice, its status, date, and the quality goals,
constraints, or risks it addresses.

```arc42
:::glossary-term
id: term-adr
title: Architecture Decision Record
definition: A structured record of an architecture decision and the rationale, status, and concerns it addresses.
:::
```

## Abstract Syntax Tree

The parser produces a lightweight document representation before the builder creates typed
workspace elements.

```arc42
:::glossary-term
id: term-ast
title: Abstract Syntax Tree
definition: The sequence of headings, prose nodes, and raw block nodes produced by parsing an arc42 Markdown file.
:::
```

## Snapshot

A snapshot is what a reader opens from a pearl in the history: the whole architecture as it was at
that commit, built in the browser from that commit's files.

```arc42
:::glossary-term
id: term-snapshot
title: Snapshot
definition: The architecture as it was at one earlier commit, built from that commit's architecture files and file list.
:::
```

## Workspace

The workspace is the model that validation and rendering operate on after all discovered files
have been parsed and built.

```arc42
:::glossary-term
id: term-workspace
title: Workspace
definition: The flat collection of typed architecture elements, parse errors, and source documents assembled from a directory.
:::
```
