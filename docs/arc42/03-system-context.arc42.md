# System Scope and Context

The arc42-language toolchain sits at the boundary between human architects, AI agents,
CI pipelines, and the files they all read and write. The system boundary is the CLI and
the core library. Everything else is external.

```arc42
:::diagram
id: diag-context
view: context
notation: mermaid
:::
```

```mermaid
graph TD
    actor-architect(["Architect"])
    actor-agent["AI Agent"]
    actor-ci["CI Pipeline"]
    actor-reader(["Reader"])

    subgraph system["System"]
        bb-cli["CLI"]
        bb-skill["Skill"]
        bb-web-renderer["Web Renderer"]
        bb-workspace["Documentation Workspace"]
    end

    actor-architect -->|"if-architect-cli"| bb-cli
    actor-architect -->|"if-architect-workspace"| bb-workspace
    actor-agent -->|"if-agent-cli"| bb-cli
    actor-agent -->|"if-agent-workspace"| bb-workspace
    actor-agent -->|"if-agent-skill"| bb-skill
    actor-ci -->|"if-ci-cli"| bb-cli
    actor-reader -->|"if-reader-web"| bb-web-renderer
    bb-skill -->|"if-skill-cli"| bb-cli
    bb-cli -->|"if-cli-web"| bb-web-renderer
```

---

:::

## Architect

The human who designs and maintains the architecture. Uses the CLI directly from a
terminal or IDE to validate workspaces and query elements. Also the primary author of
`.arc42.md` files — writes prose and DSL blocks by hand or reviews agent-authored content.

```arc42
:::actor
id: actor-architect
title: Architect
type: person
description: Human architect who authors and validates arc42 documentation
requires: if-architect-cli, if-architect-workspace, if-architect-serve
:::
```

## AI Agent

An LLM-based coding assistant (e.g. Kiro, GitHub Copilot, Claude) that reads and writes
`.arc42.md` files as part of its development workflow. Loaded with the arc42-language
SKILL.md, it uses the CLI to validate its output and discover existing elements before
making changes. The agent is a first-class author — the DSL is deliberately simple enough
that agents can produce valid files without handholding.

```arc42
:::actor
id: actor-agent
title: AI Agent
type: system
description: LLM-based coding assistant operating via the arc42-language skill
requires: if-agent-cli, if-agent-skill, if-agent-workspace
:::
```

## CI Pipeline

An automated pipeline (e.g. GitHub Actions) that runs `arc42 validate` as a quality gate
on every pull request. Consumes the JSON output and exits non-zero when errors are
present. Has no knowledge of the DSL — it only invokes the CLI and checks the exit code.

```arc42
:::actor
id: actor-ci
title: CI Pipeline
type: system
description: Automated pipeline enforcing architecture consistency on every PR
requires: if-ci-cli
:::
```

## Reader

A human who browses the rendered architecture documentation without authoring intent.
Could be a stakeholder reviewing the current design, a new team member orienting
themselves, or the architect doing a read-only pass. Interacts exclusively with
the web UI — has no direct access to the CLI or the raw `.arc42.md` files.

```arc42
:::actor
id: actor-reader
title: Reader
type: person
description: Human stakeholder or team member browsing rendered arc42 documentation via the web UI
requires: if-reader-web
:::
```
