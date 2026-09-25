# Runtime View

## Agent-driven Architecture Evolution

This representative Runtime View scenario describes how an architect reads and edits the
architecture workspace with agent assistance. Validation is intentionally shown as an implicit
quality gate at commit or merge time, rather than as a manual step in the architect's workflow.
The diff check loads the base and head snapshots of the change and lints the semantic difference
between the two models, not the changed lines.

```arc42
:::runtime-scenario
id: scenario-agent-architecture-evolution
title: Agent-driven architecture evolution
trigger: An architect asks an agent for an improvement
involves: bb-skill, bb-workspace, bb-cli, bb-core, bb-workspace-fs, bb-diff, bb-semantic-diff
:::
```

```arc42
:::diagram
id: agent-architecture-evolution-sequence
scenario: scenario-agent-architecture-evolution
notation: mermaid-sequence
aliases: bb_skill=bb-skill, bb_workspace=bb-workspace, bb_cli=bb-cli, bb_core=bb-core, bb_workspace_fs=bb-workspace-fs, bb_diff=bb-diff, bb_semantic_diff=bb-semantic-diff
:::
```

```mermaid
sequenceDiagram
    actor actor_ci as Pre-commit hook or CI
    actor actor_architect as Architect
    actor actor_agent as AI Agent
    participant bb_skill as Opencode Skill
    participant bb_workspace as Documentation Workspace
    participant bb_cli as CLI
    participant bb_workspace_fs as Filesystem Workspace Adapter
    participant bb_core as Core Library
    participant bb_diff as Diff Lint
    participant bb_semantic_diff as Semantic Diff

    actor_architect->>actor_agent: Ask for an improvement
    actor_agent->>bb_workspace: Read architecture documentation
    bb_workspace-->>actor_agent: Return relevant architecture
    actor_agent->>actor_architect: Clarify the requested change
    actor_architect-->>actor_agent: Provide clarification
    actor_agent->>bb_skill: Apply architecture authoring guidance
    actor_architect->>bb_workspace: Read and edit architecture documentation
    actor_agent->>bb_workspace: Update code and related architecture documentation
    actor_agent->>bb_workspace: Commit the change
    actor_ci->>bb_cli: Validate on commit or merge request
    bb_cli->>bb_workspace_fs: Discover and read workspace
    bb_workspace_fs->>bb_workspace: Read architecture documents
    bb_workspace_fs-->>bb_cli: Documents and path evidence
    bb_cli->>bb_core: Parse, build, resolve, and validate
    bb_core-->>bb_cli: Return validation diagnostics
    bb_cli-->>actor_ci: Return status and diagnostics
    actor_ci->>bb_cli: Compare changed architecture
    bb_cli->>bb_workspace_fs: Load base and head snapshots from Git
    bb_workspace_fs-->>bb_cli: Base/head workspace models, changes and path evidence
    bb_cli->>bb_diff: Lint architecture diff
    bb_diff->>bb_semantic_diff: Compare base and head models
    bb_semantic_diff-->>bb_diff: Element, relation, diagram and prose changes
    bb_diff-->>bb_cli: Consistency and path findings
    actor_ci-->>actor_agent: Report validation failure when inconsistent
    actor_agent->>actor_architect: Ask for correction when needed
    actor_architect-->>actor_agent: Clarify or correct the documentation
```

The participant identifiers use underscores because Mermaid does not allow hyphens in participant
IDs. The `aliases` field maps each diagram identifier to its model ID. The actors are external
participants and are therefore not included in the scenario's `involves` list. The architect is
the primary reader and editor of the workspace; the agent assists with the change, while the
pre-commit hook or CI pipeline invokes validation implicitly.

## Core model validation pipeline

The validation quality gate delegates to the core pipeline. This schematic scenario makes the
internal hand-offs explicit: parsing produces the document AST, the builder creates the model, the
resolver indexes references, the validator runs rules, and the renderer prepares output.

```arc42
:::runtime-scenario
id: scenario-core-validation-pipeline
title: Core model validation pipeline
trigger: Pre-commit hook or CI invokes architecture validation
involves: bb-parser, bb-builder, bb-resolver, bb-validator, bb-renderer, bb-workspace-fs, bb-core, bb-cli
:::
```

```arc42
:::diagram
id: core-validation-pipeline-sequence
scenario: scenario-core-validation-pipeline
notation: mermaid-sequence
aliases: bb_parser=bb-parser, bb_builder=bb-builder, bb_resolver=bb-resolver, bb_validator=bb-validator, bb_renderer=bb-renderer, bb_workspace_fs=bb-workspace-fs, bb_cli=bb-cli
:::
```

```mermaid
sequenceDiagram
    actor actor_ci as Pre-commit hook or CI
    participant bb_workspace_fs as Filesystem Workspace Adapter
    participant bb_parser as Markdown Parser
    participant bb_builder as Meta-model Builder
    participant bb_resolver as Reference Resolver
    participant bb_validator as Validator
    participant bb_renderer as Renderer Registry

    actor_ci->>bb_parser: Parse architecture documents
    bb_parser->>bb_builder: Return DocumentAst[]
    bb_builder->>bb_resolver: Return typed Workspace
    bb_resolver->>bb_validator: Return reference index
    bb_workspace_fs->>bb_validator: Inject ValidationContext (path evidence + coverage)
    bb_validator->>bb_renderer: Return diagnostics and workspace result
    bb_renderer-->>actor_ci: Render text or JSON result
```

The scenario shows the five interfaces that connect the core pipeline, plus the path context
injected by the filesystem workspace adapter (`if-workspace-paths`). It is a schematic flow, not a claim that each
stage is a separate process or that rendering is required for every validation invocation.

1. A user asks for an improvement.
2. The agent reads the architecture documentation and finds the relevant system architecture.
3. Based on that architecture, the agent enquires with the user to clarify the requested change.
4. The user provides a response.
5. The agent changes the code.
6. The agent updates the architecture documentation, but may miss some aspects of the change.
7. The agent tries to commit the change, and the pre-commit validation checks the architecture
   documentation and reports an error.
8. The agent reads the validation message and returns to the user for clarification or correction.
9. The user responds.
10. The agent updates the architecture consistently with the code and the clarified change.

## Architect browses workspace via arc42 serve

This scenario describes the flow when an architect or reader opens `arc42 serve` to browse a
workspace in the browser. The CLI starts a local HTTP server, the web renderer loads the workspace
payload, and the reader navigates documentation. The `if-reader-web`, `if-cli-web`, and
`if-web-cli-api` interfaces are all exercised in this scenario.

```arc42
:::runtime-scenario
id: scenario-serve-browser
title: Architect browses workspace via arc42 serve
trigger: Architect runs arc42 serve from the terminal
involves: bb-cli, bb-core, bb-web-renderer
:::
```

```arc42
:::diagram
id: serve-browser-sequence
scenario: scenario-serve-browser
notation: mermaid-sequence
aliases: bb_cli=bb-cli, bb_core=bb-core, bb_web=bb-web-renderer
:::
```

```mermaid
sequenceDiagram
    actor actor_architect as Architect
    participant bb_cli as CLI
    participant bb_core as Core Library
    participant bb_web as Web Renderer

    actor_architect->>bb_cli: arc42 serve (terminal)
    bb_cli->>bb_core: loadWorkspace(dir)
    bb_core-->>bb_cli: WorkspacePayload
    bb_cli->>bb_cli: Start HTTP server on localhost
    bb_cli-->>actor_architect: Listening on http://localhost:3142
    actor_architect->>bb_web: Open browser
    bb_web->>bb_cli: GET /api/workspace
    bb_cli-->>bb_web: WorkspacePayload (JSON)
    bb_web-->>actor_architect: Render documentation
    actor_architect->>bb_web: Navigate documents and element cards
```

The web renderer is a static SPA served from the CLI's distribution directory. The CLI does not
re-parse on every browser request — the workspace payload is loaded once at server startup and
cached in memory for the lifetime of the process.

## Site build with Mermaid validation and verdict loading

This scenario describes the two build-time flows specific to the Project Site and the Mermaid
Syntax building block. During `arc42 validate`, the Validator calls `@arc42/mermaid` to parse
and check Mermaid diagram syntax (W017). Separately, when the Project Site is built, the Verdicts
Vite Plugin reads `docs/verdicts` markdown files and exposes them as a virtual module consumed by
the site's React components.

```arc42
:::runtime-scenario
id: scenario-site-build-verdicts
title: Site build: Mermaid validation and verdict loading
trigger: Architect runs arc42 validate; separately, site build runs
involves: bb-validator, bb-mermaid, bb-site, bb-verdicts, bb-web-renderer
:::
```

```arc42
:::diagram
id: site-build-verdicts-sequence
scenario: scenario-site-build-verdicts
notation: mermaid-sequence
aliases: bb_validator=bb-validator, bb_mermaid=bb-mermaid, bb_site=bb-site, bb_verdicts=bb-verdicts, bb_web_renderer=bb-web-renderer
:::
```

```mermaid
sequenceDiagram
    actor actor_ci as CI / Architect
    participant bb_validator as Validator
    participant bb_mermaid as Mermaid Syntax
    participant bb_web_renderer as Web Renderer
    participant bb_site as Project Site
    participant bb_verdicts as Agent Verdicts

    actor_ci->>bb_validator: arc42 validate (includes W017 rule)
    bb_validator->>bb_mermaid: parseMermaid(diagramSource)
    bb_mermaid-->>bb_validator: MermaidParseResult (ok or failure)
    bb_validator-->>actor_ci: Diagnostics including W017 for invalid syntax

    actor_ci->>bb_web_renderer: arc42 build (web renderer)
    bb_web_renderer-->>actor_ci: dist/ (HTML/JS/CSS)

    actor_ci->>bb_site: vite build (site)
    bb_site->>bb_verdicts: Read docs/verdicts/*.md (via Vite plugin)
    bb_verdicts-->>bb_site: Parsed verdict frontmatter as virtual module
    bb_site-->>actor_ci: Static site with embedded verdict cards
```

`if-mermaid-syntax` is exercised during `arc42 validate` whenever a diagram block is present.
`if-site-verdicts` is exercised only at site build time — no runtime network calls are involved.
`if-site-docs-output` represents the build artifact produced by `arc42 build` and co-deployed under `/docs/` alongside the project site.

## Agent reads biz42 context skill

When the product this architecture documents is part of a business modeled with biz42, the AI agent
discovers the biz42 context skill at session start and reads it to understand how to consult
business-model context when authoring chapters 1, 10, or 11. No biz42 CLI is invoked and no
data crosses a system boundary — the skill is a Markdown file read directly from disk.

```arc42
:::runtime-scenario
id: scenario-biz42-skill-load
title: Agent reads biz42 context skill
trigger: Agent session starts and a biz42 business model is in scope
involves: bb-skill-biz42-context
:::
```

```arc42
:::diagram
id: biz42-skill-load-sequence
scenario: scenario-biz42-skill-load
notation: mermaid-sequence
aliases: bb_skill_biz42=bb-skill-biz42-context
:::
```

```mermaid
sequenceDiagram
    actor actor_agent as AI Agent
    participant bb_skill_biz42 as biz42 Context Skill

    actor_agent->>bb_skill_biz42: Load SKILL.md at session start
    bb_skill_biz42-->>actor_agent: Guidance on reading biz42 context (chapters 1, 10, 11)
```

The skill is a static Markdown file installed in the agent's skills directory. Loading it produces
no side effects and involves no network calls, CLI invocations, or biz42 tool interactions. The
skill tells the agent _how_ to read biz42 context — it does not perform that reading itself.

## Pull request architecture review

When a pull request is opened or updated, a GitHub Actions workflow compares the architecture of
each workspace with the merge base of the target branch. Workspaces whose architecture changed are
rendered as one self-contained review page each — every changed section of both versions, the
attribute changes and the lint findings — published as a workflow artifact. A pull request comment
(updated in place on every push) summarizes the changes and links the artifact, so a reviewer sees
the architectural impact at a glance before reading the code diff.

```arc42
:::runtime-scenario
id: scenario-pr-architecture-review
title: Pull request architecture review
trigger: A pull request is opened or updated
involves: bb-cli, bb-workspace-fs, bb-diff, bb-semantic-diff, bb-web-renderer
:::
```

```arc42
:::diagram
id: pr-architecture-review-sequence
scenario: scenario-pr-architecture-review
notation: mermaid-sequence
aliases: bb_cli=bb-cli, bb_workspace_fs=bb-workspace-fs, bb_diff=bb-diff, bb_semantic_diff=bb-semantic-diff, bb_web=bb-web-renderer
:::
```

```mermaid
sequenceDiagram
    actor actor_ci as GitHub Actions workflow
    actor actor_reviewer as Reviewer
    participant bb_cli as CLI
    participant bb_workspace_fs as Filesystem Workspace Adapter
    participant bb_diff as Diff Lint
    participant bb_semantic_diff as Semantic Diff
    participant bb_web as Web Renderer

    actor_ci->>bb_cli: arc42 diff origin/main...HEAD --format json
    bb_cli->>bb_workspace_fs: Load merge-base and head snapshots
    bb_workspace_fs-->>bb_cli: Workspace models and changes
    bb_cli->>bb_diff: Lint architecture diff
    bb_diff->>bb_semantic_diff: Compare base and head models
    bb_semantic_diff-->>bb_diff: Changes
    bb_diff-->>bb_cli: Findings and changes
    bb_cli-->>actor_ci: Changed? Counts and findings
    actor_ci->>bb_cli: arc42 build --diff origin/main...HEAD --single-file
    bb_cli-->>actor_ci: Self-contained review page (web renderer inlined)
    actor_ci-->>actor_reviewer: Artifact and pull request comment
    actor_reviewer->>bb_web: Open the review page
    bb_web-->>actor_reviewer: Rendered changed sections, both versions
```

The workflow lives in `.github/workflows/architecture-review.yml`; its logic is
`scripts/architecture-review.ts`, which can also be run locally. Pull requests from forks receive
a read-only token, so for them the review appears in the job summary instead of a comment.
