# Development Plan: arc42-language (feat/arc42-language-design branch)

_Generated on 2026-08-14 by Vibe Feature MCP_
_Workflow: [qrspi](https://codemcp.github.io/workflows/workflows/qrspi)_

## Goal

Design and implement a structured language for arc42 software architecture documentation that:

- Is human-readable first, machine-parseable second
- Enables formal verification of correctness, coherence and consistency
- Can be used by both humans (in editors) and AI agents (via CLI + opencode skill)
- Is co-created by humans and agents, not just consumed

## Key Decisions

- **Format: Markdown-flavored DSL** — Prose Markdown with typed structured blocks (e.g. `:::building-block`, `:::decision`). Preserves human readability and narrative while embedding machine-readable meta-model elements.
- **Human readability is primary** — Architecture is fundamentally about sharing ideas across humans/teams. The format must support narrative prose alongside structured data.
- **Multiple consumers, one core engine** — The language server / validation core should power: (1) a CLI for agents and CI, (2) an LSP server for editor integration. No MCP server — agents use the CLI directly, guided by an opencode skill.
- **LSP as the meta-model engine** — Language servers are the right abstraction: they understand a language's meta-model and provide diagnostics, completion, go-to-definition, and find-references — exactly the validation and navigation needed.
- **v1 scope: sections 1, 5, 8, 9** — Quality Goals, Building Blocks, Cross-cutting Concepts, Architecture Decisions. These form the core validation graph with the most structural relationships.
- **Validation rules: built-in + extensible** — Ship a fixed set of built-in rules (ESLint-style defaults), with support for project-level custom rules.
- **Three severity levels** — `error` (broken reference, invalid structure), `warning` (inconsistency, e.g. cross-cutting concern implemented by multiple components), `hint` (best practice, e.g. decision without quality goal reference).
- **Agent interaction: file-based + CLI + skill** — Agents read/write DSL files directly and call CLI for validation/querying. An opencode skill documents the format and CLI commands so agents can work with architecture files natively. No MCP server, no transactional model in v1.
- **Block syntax: `:::type` directive fences** — MyST/Pandoc fenced div syntax is the most LSP-friendly Markdown extension. Simple delimiters, multiple parser implementations, compatible with standard Markdown renderers.
- **Parser: line-oriented for v1, tree-sitter optional later** — A simple line-oriented parser (scan for `:::type` fences, parse key-value pairs inside blocks) is sufficient for v1 and avoids the complexity of maintaining a custom tree-sitter Markdown grammar. tree-sitter can be added for richer editor features later.
- **Language server: TypeScript + vscode-languageserver-node** — Most pragmatic for v1: rich ecosystem, easiest dual-use (LSP server + CLI via `bin` in package.json), broadest editor support.
- **Validation engine: pure TS library** — Shared between CLI and LSP server as a thin import. No duplication.
- **Element IDs and references** — All meta-model elements carry IDs (like Structurizr); references use IDs; all references must resolve (error if not).
- **Opencode skill** — `SKILL.md` with YAML frontmatter (`name`, `description`, `allowed-tools: Bash(arc42:*)`). Body documents block types, CLI commands, and examples for agent use.

## Notes

### Consistency rules for v1

- Components must reference defined building blocks
- Architecture decisions must reference at least one quality goal
- Cross-cutting concerns should be implemented by ideally one component (warning if multiple, error if none)
- All referenced IDs must resolve to defined elements

### Agent interaction model

Agents interact via file read/write (the DSL files) + CLI tool calls for validation and querying.
Example: `arc42 validate`, `arc42 query "components implementing cross-cutting/logging"`

## Questions

### Tasks

_All resolved_

### Completed

- [x] Created development plan file
- [x] Established that human readability is the primary design constraint
- [x] Decided on Markdown-flavored DSL over pure YAML/JSON
- [x] Identified LSP as the right meta-model/validation engine abstraction
- [x] Identified core consistency rules to validate
- [x] Established multi-consumer model (CLI + LSP + MCP) on one core engine
- [x] Decided v1 scope: arc42 sections 1, 5, 8, 9
- [x] Decided validation rules are built-in with project-level extensibility
- [x] Defined three-level severity model (error / warning / hint)
- [x] Decided agent interaction is file-based + CLI, no transactional model in v1
- [x] Decided migration is out of scope for v1 (greenfield first)

## Research

### Tasks

_All resolved_

### Existing Architecture DSLs

**Structurizr DSL**

- Text-based DSL for C4 model architecture description
- Block-structured syntax with `{` / `}` scoping; identifiers: `u = person "User"`, `ss = softwareSystem "..." { ... }`
- Validates: identifier uniqueness, relationship consistency, workspace integrity
- Parsing: Custom Java parser (structurizr-dsl library) — parser is separable from rendering
- Meta-model: Person, Software System, Container, Component, Deployment Node + Relationships
- Learning: Block structure + IDs work well; DSL parser decoupled from renderer; relationships can reference IDs across files

**ArchUnit**

- Java bytecode analysis library — rules expressed in Java fluent DSL: `classes().that(...).should(...)`
- Validates at compile-time: package deps, layer boundaries, cycle detection, annotation checks
- Not text-based; not directly applicable — but shows fluent validation rule syntax is readable
- Learning: Error messages must include exact file/line locations; validation should be fast and incremental

**PlantUML**

- Text-based diagram language: `@startuml ... @enduml` blocks; ANTLR-based parser, renders via Graphviz
- Can be embedded in Markdown via fenced blocks; rendering engine is separate from parsing
- Learning: Fenced block embedding in Markdown is an established pattern; parser and renderer can be separate concerns

**C4 Model**

- Hierarchical abstractions: Software System → Container → Component → Code
- Notation-independent; Structurizr DSL is the primary text-based C4 format
- Learning: Clear hierarchy simplifies validation; cross-level consistency checks are a known pattern

### Markdown Extension Formats

**Fenced directive syntax (`:::type`)** — used by MyST-Parser (Python), Pandoc `fenced_divs`, markdig (.NET), MystMD (JS)

- Syntax: `:::type` / `:::` open+close, or `:::{type}` variant
- LSP-friendliness: **High** — simple delimiters, no nested parsing complexity

**GFM fenced code blocks with info string** (` ```building-block `)

- Widely supported (GitHub, remark-gfm, Pandoc CommonMark)
- Renders as `<pre><code class="language-building-block">` — content is treated as code, not rendered prose
- LSP-friendliness: **High** — but semantic interpretation is non-standard

**MDX** — JSX components in Markdown

- LSP-friendliness: **Medium-Low** — requires JSX parser; complex expressions and nesting

**AsciiDoc delimited blocks** — `[role="..."]` + `====` delimiters

- LSP-friendliness: **High** — but AsciiDoc not Markdown; different ecosystem

**MyST directive syntax** — ` ```{directive} ` with `:key: value` options

- Mature ecosystem (Sphinx, Jupyter Book); VS Code extension (`myst-highlight`) proves LSP feasibility
- Consistent fence-based syntax; well-documented AST

**Finding**: `:::type` (MyST/Pandoc fenced div syntax) is the most LSP-friendly Markdown extension format. Simple delimiters, multiple parser implementations, compatible with standard Markdown renderers that pass through unknown divs.

### LSP Implementation Options

**TypeScript / vscode-languageserver-node**

- Official Microsoft LSP library; 1.8k+ stars, widely adopted in production
- Supports stdio, TCP, Node IPC transports — same core logic as CLI binary (`bin` field in package.json)
- Dual-use pattern: same TS library, two entry points (LSP server and CLI tool)
- Runtime: Node.js (available everywhere); startup slightly slower than native binaries

**Rust / tower-lsp**

- Async Rust LSP framework built on Tower; 1.4k stars, actively maintained
- Single binary for both CLI and LSP (via `[bin]` sections in Cargo.toml sharing a library)
- Excellent dual-use support; fast startup; safe memory model
- Steeper learning curve; smaller ecosystem than TS for LSP specifically

**Python / pygls**

- Based on python-language-server (2.6k stars); used by Spyder IDE
- `LanguageServer` class supports `--stdio`, `--tcp`, `--ws` modes
- Good for prototyping; higher latency than async Rust/Node for large files

**Go** — no widely adopted general-purpose LSP framework (gopls is Go-specific)

**How existing LSPs handle embedded structured content** (yaml-language-server, marksman):

- Schema association via modeline comments or workspace config
- Virtual document mapping for nested code blocks (e.g. `file://doc.md#embedded-yaml`)
- Language ID overriding in editor config (`"files.associations": {"*.arc42": "arc42"}`)

**Finding**: TypeScript + vscode-languageserver-node is the pragmatic choice for v1 — rich ecosystem, easiest dual-use (LSP + CLI), broadest editor support.

### tree-sitter for Custom Grammar Parsing

- Incremental parser generator; grammars defined in `grammar.js`, compiled to C (`parser.c`), with bindings for Node, Rust, Python, etc.
- No official `tree-sitter-markdown` grammar exists in the tree-sitter org; third-party options exist but none are canonical
- Supports injected languages (e.g. code blocks with embedded language grammars) — used by VS Code and GitHub
- LSP integration: language server uses tree-sitter bindings to generate + query syntax trees; semantic analysis is a separate layer on top

**Viability for Markdown+`:::building-block` hybrid**: Yes — viable approach:

1. Host grammar for Markdown-like prose (headings, paragraphs, lists)
2. Additional rule for `:::type` fenced blocks with open/close pattern
3. Sub-grammar or token-based parse for key-value content inside blocks
4. Challenges: Markdown prose is whitespace-sensitive and ambiguous; maintaining two grammar rule sets increases complexity; no canonical Markdown grammar to build on

**Finding**: tree-sitter is viable but complex for Markdown hybrid. Alternative: a simpler line-oriented parser (scan for `:::type` fences, parse key-value pairs inside) may be sufficient for v1 and easier to maintain.

### Opencode Skill Format

Skills are directories with a `SKILL.md` file. Format:

- YAML frontmatter with `name`, `description`, and optionally `allowed-tools`
- `description` field is used for skill activation — determines when the skill is loaded; can include trigger keywords
- `allowed-tools` restricts which CLI commands the skill can invoke (e.g. `Bash(arc42:*)`)
- Body is plain Markdown: sections for quick start, commands, examples, references

Example frontmatter:

```yaml
---
name: arc42-language
description: Work with arc42 DSL files (.arc42) — validate, query, and author arc42 architecture docs using the arc42-language CLI.
allowed-tools: Bash(arc42:*)
---
```

Skill locations: `~/.agents/skills/`, `~/.opencode/skills/`, `~/.config/opencode/skills/`

**Finding**: Skill format is simple — one `SKILL.md` per skill directory. The description field drives activation; the body teaches the agent how to use the tool.

### Existing arc42 Tooling

**arc42-template** (https://github.com/arc42/arc42-template)

- Master source in AsciiDoc; 15+ output formats (HTML, PDF, DOCX, Markdown, Confluence, LaTeX, EA EAP, etc.)
- 12 languages; two flavours: `plain` (bare structure) and `withhelp` (embedded explanations)
- Validation: CommonMark compliance checks, image reference validation — no structural/semantic validation
- Section 10 (Quality Requirements) added July 2025 (v9.0); separates quality goals (section 1) from detailed quality scenarios (section 10)

**DocToolchain**

- docs-as-code toolchain for arc42; input: AsciiDoc; output: HTML, PDF, Confluence
- Integrates PlantUML, Mermaid, Enterprise Architect
- No structural validation — purely a rendering/export pipeline

**Structurizr + arc42**: No documented integration. Teams use them independently (Structurizr for building block diagrams, arc42 template for narrative).

**Section data model** (sections 1, 5, 8, 9):

| Section                  | Typical structured data                      | Key relationships                                                |
| ------------------------ | -------------------------------------------- | ---------------------------------------------------------------- |
| 1 Quality Goals          | Quality tree, scenarios, acceptance criteria | Drives sections 8, 9, 10                                         |
| 5 Building Blocks        | Component hierarchy, interfaces, tech stack  | Referenced by sections 6 (runtime), 7 (deployment)               |
| 8 Cross-cutting Concepts | Technology choices, patterns, processes      | Supports section 5; constrained by section 9                     |
| 9 Architecture Decisions | ADR-style: context, decision, consequences   | Links to section 1 (goals), referenced by all technical sections |

**Finding**: Existing arc42 tooling is documentation generation only. No tool currently validates structural consistency or cross-section references. This is the gap our language fills.

### Completed

- [x] Surveyed existing architecture DSLs (Structurizr, ArchUnit, PlantUML, C4)
- [x] Researched Markdown extension formats (MyST, MDX, GFM, AsciiDoc, YAML frontmatter)
- [x] Researched LSP implementation options (TypeScript, Rust, Python, Go)
- [x] Evaluated tree-sitter for custom grammar parsing
- [x] Researched opencode skill format
- [x] Reviewed existing arc42 tooling (arc42-template, DocToolchain)

## Design

### Tasks

_All resolved_

### Document Structure

**File discovery: workspace-scoped, no manifest**

- CLI and LSP scan for `*.arc42.md` files in the project directory
- `--dir` flag for monorepo/multi-project repos to limit scope
- No root document, no include directives, no manifest file
- Agent just writes files into the workspace; tooling discovers them automatically
- Ordering for rendering is a separate concern, not part of v1

**Host format: Markdown first, parser-abstracted**

- v1 targets Markdown (`.arc42.md`); AsciiDoc (`.arc42.adoc`) can be added later
- Parser is behind an interface — all layers above (meta-model, validation, queries) are format-agnostic
- `.arc42.md` double extension: recognized as Markdown by default renderers; recognized as arc42 by tooling

**Parser abstraction layer**

```
File (*.arc42.md / *.arc42.adoc)
        │
   [ Parser interface ]
   MarkdownParser | AsciidocParser (future)
        │
   Common Document AST
   (headings, prose blocks, structured blocks)
        │
   [ Meta-model builder ]
   extracts typed elements (QualityGoal, BuildingBlock, etc.)
        │
   [ Validator ]
   runs rules against the element graph
        │
   CLI output (--format json|text) / LSP diagnostics
```

### Block Syntax

`:::type` fenced divs (MyST/Pandoc fenced div syntax) with YAML-style key-value attributes inside:

```markdown
:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx
parent: bb-backend
implements: concept/logging, concept/auth
:::
```

- Open fence: `:::type` (block type on same line)
- Close fence: `:::` (three colons, alone on line)
- Attributes: `key: value` lines inside the block, one per line
- Multi-value attributes: comma-separated or YAML list syntax (`[a, b]`)
- Prose narrative goes outside blocks (before or after); blocks hold structured metadata only

### Meta-model (v1 block types)

**`:::quality-goal`** (arc42 section 1)

```
id:       required, unique identifier (e.g. qg-performance)
title:    required, human-readable name
priority: required, high | medium | low
scenario: optional, measurable acceptance criterion (short text)
```

**`:::building-block`** (arc42 section 5)

```
id:           required, unique identifier (e.g. bb-api-gateway)
title:        required, human-readable name
technology:   optional, free text
parent:       optional, id of parent building-block (flat hierarchy via reference)
implements:   optional, comma-separated list of concept ids
```

**`:::interface`** (arc42 section 5, connection between building blocks)

```
id:       required, unique identifier
title:    required, name
between:  required, two building-block ids (comma-separated)
protocol: optional, free text
```

**`:::concept`** (arc42 section 8 — cross-cutting concept)

```
id:       required, unique identifier (e.g. concept/logging)
title:    required, name
category: optional, security | persistence | ui | error-handling | observability | ... (extensible)
```

**`:::decision`** (arc42 section 9 — architecture decision record)

```
id:        required, unique identifier (e.g. dd-001)
title:     required, short decision statement
status:    required, proposed | accepted | deprecated | superseded
date:      optional, ISO date (YYYY-MM-DD)
addresses: optional, comma-separated list of quality-goal ids
```

### Hierarchy Model

Building block hierarchy is **flat with `parent:` reference** — no nested blocks.

- Simpler to parse (line-oriented, no depth tracking)
- Easier for agents to write without mistakes
- Validator reconstructs the tree from `parent:` references
- Circular parent references are a validation error

### Validation Rules (v1)

**Errors** (broken structure):

- Duplicate `id` within workspace
- Reference to undefined id (`parent:`, `implements:`, `between:`, `addresses:`)
- Circular `parent:` reference in building blocks
- `interface.between` referencing non-building-block ids
- Required attribute missing

**Warnings** (inconsistency):

- Cross-cutting concept with no building block implementing it
- Building block with no interface (isolated component)
- Decision with `status: proposed` older than 90 days (if `date:` present)

**Hints** (best practice):

- Decision with no `addresses:` reference to a quality goal
- Quality goal with no decision addressing it
- Building block with no `technology:` attribute

### CLI Interface

```
arc42 validate [--dir <path>] [--format json|text]
arc42 list <block-type> [--format json|text]
arc42 show <id> [--format json|text]
arc42 check <id>          # show element + all references to/from it
arc42 query "<natural language or structured query>"  # future
```

Default output format: `json` (agent-primary); `--format text` for human-readable output.

### Completed

- [x] Decided file discovery: workspace-scoped, no manifest, `--dir` for monorepos
- [x] Decided host format: Markdown first, parser behind interface for future AsciiDoc support
- [x] Defined parser abstraction layer and component pipeline
- [x] Defined block syntax: `:::type` fenced divs with YAML-style attributes
- [x] Defined meta-model: 5 block types (quality-goal, building-block, interface, concept, decision)
- [x] Decided hierarchy model: flat with `parent:` reference (no nested blocks)
- [x] Defined validation rule categories (error / warning / hint) with concrete v1 rules
- [x] Defined CLI interface and output format strategy

## Structure

### Tasks

_All resolved_

### Vertical Slices

**Slice 1 — Parse and validate (MVP)**
End-user can write `.arc42.md` files with any of the 5 block types, run `arc42 validate`, and get errors/warnings/hints with file path and line number.

This is the core value proposition. Proves the parser, meta-model, reference resolver, and validator all work together.

Components touched:

- File discovery (glob `*.arc42.md` in workspace, `--dir` flag)
- `MarkdownParser` implementing the `Parser` interface (line-oriented, `:::type` fences)
- Common Document AST (headings, prose nodes, structured block nodes with attributes)
- Meta-model builder (all 5 block types: quality-goal, building-block, interface, concept, decision)
- Reference resolver (builds bidirectional ID index, resolves all cross-references)
- Validator (full error + warning + hint rule set)
- CLI `validate` command with `--format json|text`

End-to-end test: fixture folder with a realistic mini-architecture (3–4 files). Fixture contains deliberate broken references, missing required attributes, isolated components, and a stale proposed decision. Assert diagnostic codes, severities, file paths, and line numbers in JSON output.

---

**Gate: agent-generated end-to-end test**
Before proceeding to Slice 2, an agent (or CI job) generates a complete realistic arc42 document set from scratch using only the block syntax spec, runs `arc42 validate` against it, and asserts zero errors. This validates that the format is agent-writable without handholding.

---

**Slice 2 — Query and inspect**
User (or agent) can enumerate elements and inspect individual elements with their full reference context.

Components touched:

- Bidirectional reference index (already built by resolver in Slice 1)
- CLI `list <block-type>` command
- CLI `show <id>` command (element attributes + all inbound/outbound references)

End-to-end test: same fixture workspace from Slice 1 → assert `list` returns correct element count and shapes; assert `show` output includes forward and backward references.

---

**Slice 3 — Opencode skill + LSP (post-MVP)**
Agent can work with arc42 files natively in opencode via a skill. Human editors get inline diagnostics in VS Code via LSP.

Components touched:

- `SKILL.md` documenting block syntax, CLI commands, and authoring examples
- LSP server entry point (document open/change/save → run validator → emit `Diagnostic` objects with range)
- VS Code extension manifest (`language-configuration.json`, file association for `*.arc42.md`)

End-to-end test for LSP: programmatic LSP client test — open a file with a known reference error, assert diagnostics returned with correct range and message.

Note: Slice 3 does not change the parser, meta-model, or validator. It is purely a new consumer of the existing core.

### Tech Stack

**Language**: TypeScript 5.x
**Package manager**: pnpm
**Unified toolchain**: Vite+ (`vp` CLI) — bundles Vitest, tsdown/Rolldown, Oxlint, Oxfmt, tsgo under one tool

- `vp pack` — builds CLI binary (with shebang) + library output via tsdown/Rolldown
- `vp test` — runs Vitest (fast, ESM-native, Jest-compatible API)
- `vp check` — format (Oxfmt) + lint (Oxlint) + type-check (tsgo) in one pass
  **LSP library**: `vscode-languageserver-node` — dual-use (LSP server entry point + CLI binary, same core library)

### Completed

- [x] Defined 3 vertical slices with clear component boundaries and test strategies
- [x] Scoped MVP to Slice 1 (parse + validate) — sufficient for end-user validation of the concept
- [x] Added agent-generated end-to-end gate between Slice 1 and Slice 2
- [x] Deferred LSP and skill to Slice 3 (post-MVP, no core changes required)
- [x] Decided tech stack: TypeScript + pnpm + Vite+ (`vp`) + vscode-languageserver-node

## Plan

### Tasks

#### P0 — Repo scaffold

- [ ] **P0.1 Init monorepo** — Create `pnpm-workspace.yaml` listing `packages/*`. Create root `package.json` with `"private": true`, `"engines": {"node": ">=20"}`, and workspace-level scripts: `"build": "vp pack -r"`, `"test": "vp test -r"`, `"check": "vp check -r"`. Add `.gitignore` (node_modules, dist, \*.tsbuildinfo). No dependencies at root.
- [ ] **P0.2 Create `packages/core`** — `package.json`: `name: @arc42/core`, `version: 0.1.0`, `private: true`, `main: dist/index.js`, `types: dist/index.d.ts`. Dev deps: `typescript`, `viteplus`, `vitest`. Peer deps: none. Create `src/index.ts` (barrel export). Create `tsconfig.json`: `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `strict: true`, `outDir: dist`, `declaration: true`.
- [ ] **P0.3 Create `packages/cli`** — `package.json`: `name: @arc42/cli`, `version: 0.1.0`, `bin: {"arc42": "dist/cli.js"}`. Dep: `@arc42/core: "workspace:*"`. Dev deps: same as core. Create `src/cli.ts` with shebang (`#!/usr/bin/env node`). `tsconfig.json`: same settings as core.
- [ ] **P0.4 Verify toolchain** — Run `pnpm install` from root. Run `vp check` (should pass on empty stubs). Run `vp test` (zero tests → passes). Confirm `vp pack` produces `dist/` in both packages.

#### P1 — Core: AST types

- [ ] **P1.1 Define AST node types** — Create `packages/core/src/ast.ts`. Define types:
  ```ts
  type NodeKind = "heading" | "prose" | "block";
  interface HeadingNode {
    kind: "heading";
    level: number;
    text: string;
    line: number;
  }
  interface ProseNode {
    kind: "prose";
    text: string;
    line: number;
  }
  interface BlockNode {
    kind: "block";
    blockType: BlockType;
    attributes: Record<string, string>;
    startLine: number;
    endLine: number;
  }
  type AstNode = HeadingNode | ProseNode | BlockNode;
  interface DocumentAst {
    filePath: string;
    nodes: AstNode[];
  }
  type BlockType = "quality-goal" | "building-block" | "interface" | "concept" | "decision";
  ```
  Export all from `src/index.ts`. No deps.

#### P2 — Core: MarkdownParser

- [ ] **P2.1 Implement line-oriented parser** — Create `packages/core/src/parser/markdown-parser.ts`. Algorithm:
  1. Split file content into lines (preserve line numbers, 1-indexed).
  2. Scan lines sequentially. When a line matches `/^:::([a-z-]+)\s*$/`, open a block of that type, record `startLine`.
  3. Inside an open block, lines matching `/^([a-z-]+):\s*(.*)$/` are attributes. All other non-empty lines are ignored (they may be prose inside a future format extension — treat as unknown attribute lines and skip).
  4. When a line matches `/^:::\s*$/` (closing fence), close the block, record `endLine`, emit `BlockNode`.
  5. Outside blocks: lines starting with `#` are `HeadingNode` (count `#` for level, trim text). All other non-empty lines are `ProseNode`.
  6. Return `DocumentAst`.
  - Export `parseMarkdown(filePath: string, content: string): DocumentAst`.
- [ ] **P2.2 Define Parser interface** — Create `packages/core/src/parser/index.ts`:
  ```ts
  interface Parser { parse(filePath: string, content: string): DocumentAst }
  class MarkdownParser implements Parser { parse(...) { return parseMarkdown(...) } }
  ```
  Export both.
- [ ] **P2.3 Unit tests for parser** — `packages/core/src/parser/markdown-parser.test.ts`. Test cases:
  - Empty file → empty nodes array.
  - Single `:::quality-goal` block → one `BlockNode` with correct attributes and line numbers.
  - Mixed prose + block + heading → correct node sequence.
  - Unclosed block → no BlockNode emitted (silently ignored, validator will report via missing required attrs).
  - Multi-value attribute (`implements: a, b`) → stored as raw string `"a, b"` (splitting is meta-model builder's job).
  - Block with unrecognized type → still emitted as `BlockNode` (validator catches unknown block types, parser stays dumb).

#### P3 — Core: Meta-model builder

- [ ] **P3.1 Define meta-model element types** — Create `packages/core/src/model/types.ts`:

  ```ts
  interface SourceLocation {
    file: string;
    line: number;
  }

  interface QualityGoal {
    kind: "quality-goal";
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    scenario?: string;
    loc: SourceLocation;
  }
  interface BuildingBlock {
    kind: "building-block";
    id: string;
    title: string;
    technology?: string;
    parent?: string;
    implements: string[];
    loc: SourceLocation;
  }
  interface Interface {
    kind: "interface";
    id: string;
    title: string;
    between: [string, string];
    protocol?: string;
    loc: SourceLocation;
  }
  interface Concept {
    kind: "concept";
    id: string;
    title: string;
    category?: string;
    loc: SourceLocation;
  }
  interface Decision {
    kind: "decision";
    id: string;
    title: string;
    status: "proposed" | "accepted" | "deprecated" | "superseded";
    date?: string;
    addresses: string[];
    loc: SourceLocation;
  }

  type Element = QualityGoal | BuildingBlock | Interface | Concept | Decision;
  interface Workspace {
    elements: Element[];
    parseErrors: ParseError[];
  }
  interface ParseError {
    message: string;
    file: string;
    line: number;
  }
  ```

- [ ] **P3.2 Implement meta-model builder** — Create `packages/core/src/model/builder.ts`. Takes `DocumentAst[]` → `Workspace`. For each `BlockNode`:
  - Extract `id`, `title` (required fields). If missing, emit `ParseError`, skip element.
  - Parse type-specific fields (e.g. `implements` split on `,` and trim; `between` split on `,` expect exactly 2 items; `addresses` split on `,`).
  - Validate `priority` enum for quality-goal; `status` enum for decision; if invalid value emit `ParseError`.
  - Unknown `blockType` values: emit `ParseError` and skip.
  - Return `Workspace` with all successfully parsed elements and all parse errors.
- [ ] **P3.3 Unit tests for builder** — Test: valid block → correct element. Missing `id` → ParseError. Unknown block type → ParseError. `between` with 3 items → ParseError. Invalid `priority` value → ParseError.

#### P4 — Core: Reference resolver + index

- [ ] **P4.1 Build reference index** — Create `packages/core/src/resolver/index.ts`. Takes `Workspace`. Returns:
  ```ts
  interface ReferenceIndex {
    byId: Map<string, Element>; // id → element
    refsFrom: Map<string, string[]>; // id → list of ids this element references
    refsTo: Map<string, string[]>; // id → list of ids that reference this element
  }
  function buildIndex(workspace: Workspace): ReferenceIndex;
  ```
  Population logic: for each element, collect all outbound reference fields (`parent`, `implements[]`, `between[]`, `addresses[]`) and populate both maps bidirectionally.
- [ ] **P4.2 Unit tests for resolver** — Test: two elements, one references the other → both maps populated. Element with no references → appears in `byId` but not in `refsFrom`. Duplicate IDs → `byId` stores last; validator (not resolver) reports the error.

#### P5 — Core: Validator

- [ ] **P5.1 Define diagnostic types** — Create `packages/core/src/validator/types.ts`:
  ```ts
  type Severity = "error" | "warning" | "hint";
  interface Diagnostic {
    code: string;
    severity: Severity;
    message: string;
    file: string;
    line: number;
  }
  ```
  Diagnostic codes:
  | Code | Severity | Rule |
  |------|----------|------|
  | E001 | error | Duplicate `id` |
  | E002 | error | Unresolved reference |
  | E003 | error | Circular `parent` reference |
  | E004 | error | `interface.between` references non-building-block |
  | E005 | error | Missing required attribute |
  | W001 | warning | Concept with no implementing building-block |
  | W002 | warning | Isolated building-block (no interface on either side) |
  | W003 | warning | Decision `status: proposed` older than 90 days |
  | H001 | hint | Decision without `addresses` |
  | H002 | hint | Quality goal not addressed by any decision |
  | H003 | hint | Building-block without `technology` |
- [ ] **P5.2 Implement validator** — Create `packages/core/src/validator/index.ts`. Signature: `validate(workspace: Workspace, index: ReferenceIndex): Diagnostic[]`. Implement each rule as a separate private function, compose results. Rules:
  - **E001**: Collect all ids from `workspace.elements`; report duplicates with first/second occurrence locations.
  - **E002**: For each reference field in each element, check `index.byId.has(refId)`. If not, emit E002 with the element's location.
  - **E003**: For `building-block` elements with `parent`, follow the parent chain until either no parent or a visited id is re-encountered → cycle → emit E003 for all elements in the cycle.
  - **E004**: For each `interface`, check that both ids in `between` resolve to elements with `kind === 'building-block'`.
  - **E005**: Emitted by the meta-model builder (P3.2), so validator re-includes `workspace.parseErrors` as E005 diagnostics.
  - **W001**: For each concept, check `index.refsTo.get(concept.id)` contains at least one building-block. If none, emit W001.
  - **W002**: For each building-block, check whether its id appears in any `interface.between` pair. If not, emit W002.
  - **W003**: For each decision with `status === 'proposed'` and a `date` field, parse the date; if `today - date > 90 days`, emit W003.
  - **H001**: Decision where `addresses.length === 0` → emit H001.
  - **H002**: For each quality-goal, check `index.refsTo.get(qg.id)` contains at least one decision → if none, emit H002.
  - **H003**: Building-block where `technology` is undefined → emit H003.
- [ ] **P5.3 Unit tests for validator** — One test per rule. Use minimal `Workspace` + `ReferenceIndex` fixtures constructed inline (no file I/O). Assert correct code, severity, file, line.

#### P6 — Core: File discovery

- [ ] **P6.1 Implement file discovery** — Create `packages/core/src/discovery.ts`:
  ```ts
  async function discoverFiles(dir: string): Promise<string[]>;
  ```
  Uses Node.js `fs` + `path` to recursively walk `dir`, returning all files matching `*.arc42.md`. No third-party glob library — recursive `fs.readdir` with `{ withFileTypes: true }` is sufficient and has no deps.
- [ ] **P6.2 Unit tests for discovery** — Create a temp directory fixture in `packages/core/src/__fixtures__/`. Assert that only `.arc42.md` files are returned, nested dirs are included, non-matching files are excluded.

#### P7 — Core: Top-level API

- [ ] **P7.1 Assemble pipeline** — Create `packages/core/src/arc42.ts`:
  ```ts
  interface ValidateOptions {
    dir: string;
  }
  interface ValidateResult {
    valid: boolean;
    diagnostics: Diagnostic[];
  }
  async function validateWorkspace(opts: ValidateOptions): Promise<ValidateResult>;
  ```
  Pipeline: `discoverFiles` → read each file → `MarkdownParser.parse` → `buildWorkspace` → `buildIndex` → `validate` → return result.
- [ ] **P7.2 Export from barrel** — `packages/core/src/index.ts` exports: `validateWorkspace`, `ValidateOptions`, `ValidateResult`, `Diagnostic`, `Severity`, all element types, `ReferenceIndex`.

#### P8 — CLI: validate command (Slice 1 done)

- [ ] **P8.1 Wire CLI entry point** — `packages/cli/src/cli.ts` (with `#!/usr/bin/env node` shebang). Use Node.js built-in `parseArgs` (`util.parseArgs`) — no third-party arg parser. Parse: `arc42 validate [--dir <path>] [--format json|text]`. Default `--dir`: `process.cwd()`. Default `--format`: `json`.
- [ ] **P8.2 JSON output** — When `--format json`, `JSON.stringify(result, null, 2)` to stdout. Exit code 0 if `result.valid`, 1 otherwise.
- [ ] **P8.3 Text output** — When `--format text`, format each diagnostic as: `<severity> <code>  <file>:<line>  <message>`. Print summary line: `N errors, M warnings, K hints`. Exit code same as JSON mode.
- [ ] **P8.4 End-to-end fixture test** — Create `packages/core/src/__fixtures__/mini-arch/`. Three files:
  - `quality-goals.arc42.md` — 2 quality goals, one with priority, one missing priority (→ E005)
  - `building-blocks.arc42.md` — 3 building blocks; one references undefined parent (→ E002); one has no interface (→ W002); one has no technology (→ H003)
  - `decisions.arc42.md` — 2 decisions; one without `addresses` (→ H001); one proposed with a date 100 days ago (→ W003)
    Also add one concept with no implementing building-block (→ W001).
    Test: run `validateWorkspace({ dir: fixturePath })`, assert exact set of diagnostic codes.

#### P9 — CLI: list / show / check commands (Slice 2)

- [ ] **P9.1 Extend core API** — Add to `packages/core/src/arc42.ts`:
  ```ts
  async function listElements(opts: { dir: string; type: BlockType }): Promise<Element[]>;
  async function showElement(opts: {
    dir: string;
    id: string;
  }): Promise<{ element: Element; refsFrom: Element[]; refsTo: Element[] } | null>;
  ```
  These reuse the same pipeline (discover → parse → build → index). No new parsing logic.
- [ ] **P9.2 Wire `list` command** — `arc42 list <type> [--format json|text]`. JSON: array of elements. Text: one line per element `<id>  <title>  (<file>:<line>)`. Exit 1 if unknown type.
- [ ] **P9.3 Wire `show` command** — `arc42 show <id> [--format json|text]`. JSON: `{ element, refsFrom, refsTo }`. Text: element attributes + `Referenced by: ...` + `References: ...` sections. Exit 1 if id not found.
- [ ] **P9.4 Wire `check` command** — Alias for `show` in terms of output; adds exit code 1 if element has any associated diagnostics (run validate, filter by element id match in message or location).
- [ ] **P9.5 End-to-end tests for query** — Using the same `mini-arch` fixture: assert `listElements({ type: 'decision' })` returns 2 elements; assert `showElement({ id: 'qg-perf' })` returns element + populated refsTo from decisions.

#### P10 — Slice 3 (post-MVP, high-level only)

- [ ] **P10.1 SKILL.md** — Write `packages/skill/SKILL.md` with YAML frontmatter (`name`, `description`, `allowed-tools: Bash(arc42:*)`). Body: block type reference, CLI command reference with examples, common agent workflows.
- [ ] **P10.2 LSP server entry point** — `packages/lsp/src/server.ts`. Use `vscode-languageserver/node`. On `textDocument/didOpen` and `textDocument/didChange`, run `validateWorkspace` against the file's directory, convert `Diagnostic[]` to LSP `Diagnostic` objects (map `line` to `Range`), publish via `connection.sendDiagnostics`.
- [ ] **P10.3 VS Code extension manifest** — `packages/lsp/package.json` with `"contributes"` section: language id `arc42`, file pattern `**/*.arc42.md`, file icon. Language configuration JSON for `:::` fence toggling.

### Key Decisions (Plan phase)

- **No third-party arg parser** — Node.js `util.parseArgs` (available since Node 18) is sufficient for the CLI's simple command structure. Avoids a runtime dependency.
- **No third-party glob** — Recursive `fs.readdir` with `withFileTypes` covers all needs; avoids `fast-glob` or `glob` as runtime dep.
- **Parser emits unknown block types** — Parser stays dumb; meta-model builder rejects unknown types with ParseError. This keeps the parser stable across future block type additions.
- **ParseErrors become E005** — Builder-detected structural errors (missing required attribute, invalid enum) are surfaced as E005 diagnostics by the validator via `workspace.parseErrors`, keeping the validation output uniform.
- **Same pipeline for validate + list/show** — All commands run the full discover→parse→build→index pipeline. No caching in v1. Adds minor latency for large workspaces but keeps code simple; optimization is a post-v1 concern.
- **Diagnostic codes are strings** — `"E001"` not `1`. Easier to display, grep, and reference in docs. Never change existing codes (only add new ones).
- **Exit codes** — 0 = valid (no errors), 1 = invalid (≥1 error) or command error. Warnings and hints do not affect exit code.
- **Monorepo with pnpm workspaces** — `packages/core` (pure lib), `packages/cli` (binary), `packages/lsp` (server, Slice 3), `packages/skill` (SKILL.md only, Slice 3). Clean separation allows consuming `core` without bundling CLI deps.

### Completed

_None yet_

## Implement

### Tasks

- [ ] P11 — Renderer registry: `WorkspaceRenderer` + `ElementRenderers` in `packages/core/src/renderer/`; implement `TextRenderer` (chapter-grouped, compact) and `JsonRenderer` (flat array + edges); export `builtinRenderers` + `rendererById`
- [ ] P12 — Rewrite CLI to final surface: `arc42 [--dir] validate|get|rules`; wire renderer registry; implement `get` (workspace + single-element), global `--dir` flag + `ARC42_DIR` env var, exit code table
- [ ] P13 — Tests for `get` command: workspace view (ordering, edges), single-element view (1-hop bidirectional), `--type` filter, not-found exit 1
- [ ] P10 — Slice 3: SKILL.md + LSP server (post-MVP)

### Key Decisions (Implement phase)

- **Rule registry pattern (ESLint-inspired)** — Each rule is a self-describing `Rule` object with `meta: { code, severity, type, docs: { description, arc42Chapter, recommended } }` and a `check()` function. The `validate()` function is now just `builtinRules.flatMap(r => r.check(ws, idx))`. Rules live in `packages/core/src/validator/rules/` one file per rule, named `e001-duplicate-id.ts` etc. Enables `arc42 rules` CLI command and chapter-grouped output. Decided against taking `@eslint/core` as a dependency — it exports only types and its `RuleDefinition` is coupled to AST visitor/traversal model which doesn't fit our graph-based validation.
- **`dts: true` not `dts: { tsgo: true }`** — `tsgo` requires `@typescript/native-preview` which is not installed; plain `dts: true` uses the standard tsc-based path and works fine.
- **Test imports use `../src/` (not `../../src/`)** — Tests live in `packages/core/tests/`; source is `packages/core/src/`. One level up is enough.
- **TDD approach followed** — E2E fixture test written first (red), then all implementation written to make it green. Unit tests for parser, builder, resolver, and validator written alongside.
- **CLI entry configured explicitly** — `vite.config.ts` for `@arc42/cli` sets `pack.entry: "src/cli.ts"` explicitly (auto-detection only picks up `src/index.ts`).
- **CLI surface revised after design review** — Dropped `list`, `show`, `check`, `overview` in favour of three commands: `validate`, `get`, `rules`. Reviewed by two independent agent reviewers. Key decisions:
  - `get` alone (not `get` + `show`) — splitting only adds value when contracts differ; both would return "element with full detail", so distinction belongs to `--format` not command name. Precedent: `kubectl get`.
  - `get` always returns an array — `get <id>` returns `[element]`, `get` returns all elements. Uniform contract for agents; no branching on return type.
  - `get` without `<id>` = workspace overview — no-arg means all resources (cf. `docker ps`, `terraform state list`).
  - `get --type <type>` filters by element kind — `--type` preferred over `--kind` (K8s jargon) or positional (ambiguous with id).
  - Workspace JSON includes `edges` array — flat element list alone is insufficient for graph reasoning; edges are free to produce from the existing index.
  - `get <id>` resolves 1-hop neighbors bidirectionally — a building-block shows interfaces it participates in even though `between[]` lives on the interface.
  - `--dir` is a global flag — workspace-scoping is not command-specific; also supports `ARC42_DIR` env var. Resolution: `--dir` > `ARC42_DIR` > cwd.
  - Exit codes: 0 = success, 1 = validation errors / not found, 2 = usage error.
  - `--format text` always as default — no isatty auto-detection (breaks reproducibility for agents).
  - `--quiet` on `validate` for CI gates (suppress hints/warnings output, just exit code).
- **Element kind order modelled as first-class data** — `ELEMENT_KIND_ORDER`, `ELEMENT_CHAPTER`, `CHAPTER_TITLE` exported from `packages/core/src/model/types.ts`. All renderers and CLI commands import from this single source rather than duplicating the arc42 chapter ordering. Order: quality-goal → building-block → interface → concept → decision (arc42 chapters 1 → 5 → 5 → 8 → 9). Within each kind: alphabetical by id for stable, reproducible output and clean diffs.
- **Renderer registry pattern** — `WorkspaceRenderer.render(workspace, index): string` is the only public contract. Internal `ElementRenderers` per format (text, json) for composability. Graphviz/HTML are future work and specifically not constrained to the element-per-element pattern (graphviz needs separate node + edge passes). The registry (`builtinRenderers`, `rendererById`) mirrors the rule registry pattern.
- **`check` command dropped** — was: show + filter diagnostics to one element. Redundant with `validate` + `get`. Consistency is a workspace property, not an element property. If element-scoped filtering is needed later, add `--scope <id>` to `validate`.
- **`list` command replaced by `get --type`** — `list` was a flat filter over the model; `get` with optional `--type` covers the same use case with a more composable interface. `list` as a separate command added noise without adding capability.
- **Workspace carries `documents: DocumentAst[]`** — Structure-aware rules (W004, W005) need the raw AST to scan node sequences. Rather than re-parsing, the `Workspace` struct now carries the documents array from `buildWorkspace`. Rules that don't need it ignore it; tests that construct workspaces inline pass `documents: []`.
- **W004 / W005 — two new structural warnings** — W004: block has no prose introduction between it and the preceding heading (naked block). W005: heading section contains more than one block (should split into sub-sections). Both are `type: "suggestion"` and `arc42Chapter: 0` (cross-cutting, all chapters). Convention enforced: one block per sub-heading, always with narrative prose before it.
- **`Arc42Chapter` extended to include 0** — 0 = cross-cutting / document-structure rules that apply to all chapters. Previously only 1, 5, 8, 9 were valid. `arc42 rules --chapter` does not expose 0 as a filter option (it's internal metadata only).
- **`examples/bookstore-backend/`** — Clean, valid 4-file example workspace (quality-goals, building-blocks, concepts, decisions). All elements valid. Each block is embedded in a prose chapter (validates W004/W005 pattern). Ships as the reference template for human authors and agents.

### Completed

- [x] P0 — Monorepo scaffold
- [x] P1 — AST types
- [x] P2 — MarkdownParser + unit tests
- [x] P3 — Meta-model types + builder + unit tests
- [x] P4 — Reference resolver + index + unit tests
- [x] P5 — Validator with all 11 rules + unit tests
- [x] P6 — File discovery
- [x] P7 — Top-level API (`validateWorkspace`, `getElements`) + barrel export
- [x] P8 — CLI initial implementation (superseded by P12)
- [x] P8.4 — E2E fixture test against `__fixtures__/mini-arch/`
- [x] P11 — Renderer registry: `GetRenderer` interface, `WorkspaceView`/`ElementView`/`Edge`/`ResolvedRef` types, `TextGetRenderer`, `JsonGetRenderer`, `builtinGetRenderers`/`rendererById` registry
- [x] P12 — CLI rewritten to final surface: `arc42 [--dir] validate|get|rules`; global `--dir` + `ARC42_DIR` env; `get` always returns array via renderer; exit codes 0/1/2
- [x] P13 — Tests for renderer + `getElements` API (26 tests, TDD red→green via separate agents)
- [x] Element kind order modelled: `ELEMENT_KIND_ORDER`, `ELEMENT_CHAPTER`, `CHAPTER_TITLE`
- [x] Build verified: `vp pack` succeeds for both packages; CLI end-to-end verified
- [x] All 63 tests pass (`vp test`)
- [x] W004 + W005 — two new structural warnings: block-without-prose and multiple-blocks-under-heading; `Arc42Chapter` extended with 0 for cross-cutting rules; 5 new tests; 68 total passing
- [x] `examples/bookstore-backend/` — 4-file clean example workspace; each block has its own sub-section with prose; validates with 0 errors/warnings/hints
- [x] `rationale` field added to `RuleDocs` — each of the 13 rules carries a plain-English explanation of why the rule exists; shown in `arc42 rules --format text`; `Chapter 0 — Document Structure` label added for cross-cutting rules (W004/W005)
- [ ] P10 — Slice 3: SKILL.md + LSP server (post-MVP)

## Commit

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
