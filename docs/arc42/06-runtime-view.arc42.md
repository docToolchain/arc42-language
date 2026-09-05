# Runtime View

## Agent-driven Architecture Evolution

This representative Runtime View scenario describes how an architect reads and edits the
architecture workspace with agent assistance. Validation is intentionally shown as an implicit
quality gate at commit or merge time, rather than as a manual step in the architect's workflow.

```arc42
:::runtime-scenario
id: scenario-agent-architecture-evolution
title: Agent-driven architecture evolution
trigger: An architect asks an agent for an improvement
involves: bb-skill, bb-workspace, bb-cli, bb-core
:::
```

:::diagram
id: agent-architecture-evolution-sequence
scenario: scenario-agent-architecture-evolution
notation: mermaid-sequence
aliases: bb_skill=bb-skill, bb_workspace=bb-workspace, bb_cli=bb-cli, bb_core=bb-core
:::

```mermaid
sequenceDiagram
    actor actor_ci as Pre-commit hook or CI
    actor actor_architect as Architect
    actor actor_agent as AI Agent
    participant bb_skill as Opencode Skill
    participant bb_workspace as Documentation Workspace
    participant bb_cli as CLI
    participant bb_core as Core Library

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
    bb_cli->>bb_core: Parse, build, resolve, and validate
    bb_core-->>bb_cli: Return validation diagnostics
    bb_cli-->>actor_ci: Return status and diagnostics
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
involves: bb-parser, bb-builder, bb-resolver, bb-validator, bb-renderer
:::
```

:::diagram
id: core-validation-pipeline-sequence
scenario: scenario-core-validation-pipeline
notation: mermaid-sequence
aliases: bb_parser=bb-parser, bb_builder=bb-builder, bb_resolver=bb-resolver, bb_validator=bb-validator, bb_renderer=bb-renderer
:::

```mermaid
sequenceDiagram
    actor actor_ci as Pre-commit hook or CI
    participant bb_parser as Markdown Parser
    participant bb_builder as Meta-model Builder
    participant bb_resolver as Reference Resolver
    participant bb_validator as Validator
    participant bb_renderer as Renderer Registry

    actor_ci->>bb_parser: Parse architecture documents
    bb_parser->>bb_builder: Return DocumentAst[]
    bb_builder->>bb_resolver: Return typed Workspace
    bb_resolver->>bb_validator: Return reference index
    bb_validator->>bb_renderer: Return diagnostics and workspace result
    bb_renderer-->>actor_ci: Render text or JSON result
```

The scenario intentionally shows the four interfaces that connect the core pipeline. It is a
schematic flow, not a claim that each stage is a separate process or that rendering is required for
every validation invocation.

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
`if-web-core` interfaces are all exercised in this scenario.

```arc42
:::runtime-scenario
id: scenario-serve-browser
title: Architect browses workspace via arc42 serve
trigger: Architect runs arc42 serve from the terminal
involves: bb-cli, bb-core, bb-web-renderer
:::
```

:::diagram
id: serve-browser-sequence
scenario: scenario-serve-browser
notation: mermaid-sequence
aliases: bb_cli=bb-cli, bb_core=bb-core, bb_web=bb-web-renderer
:::

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
