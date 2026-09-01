# System Scope and Context

The arc42-language toolchain sits at the boundary between human architects, AI agents,
CI pipelines, and the files they all read and write. The system boundary is the CLI and
the core library. Everything else is external.

## Architect

The human who designs and maintains the architecture. Uses the CLI directly from a
terminal or IDE to validate workspaces and query elements. Also the primary author of
`.arc42.md` files — writes prose and DSL blocks by hand or reviews agent-authored content.

:::actor
id: actor-architect
title: Architect
type: person
description: Human architect who authors and validates arc42 documentation
:::

## AI Agent

An LLM-based coding assistant (e.g. Kiro, GitHub Copilot, Claude) that reads and writes
`.arc42.md` files as part of its development workflow. Loaded with the arc42-language
SKILL.md, it uses the CLI to validate its output and discover existing elements before
making changes. The agent is a first-class author — the DSL is deliberately simple enough
that agents can produce valid files without handholding.

:::actor
id: actor-agent
title: AI Agent
type: system
description: LLM-based coding assistant operating via the arc42-language skill
:::

## CI Pipeline

An automated pipeline (e.g. GitHub Actions) that runs `arc42 validate` as a quality gate
on every pull request. Consumes the JSON output and exits non-zero when errors are
present. Has no knowledge of the DSL — it only invokes the CLI and checks the exit code.

:::actor
id: actor-ci
title: CI Pipeline
type: system
description: Automated pipeline enforcing architecture consistency on every PR
:::

## Architect → CLI Interface

The architect invokes `arc42 validate`, `arc42 get`, and `arc42 rules` directly from
the terminal. The CLI reads `.arc42.md` files from the current directory (or `--dir`).

:::interface
id: if-architect-cli
title: Architect → CLI
between: actor-architect, bb-cli
protocol: Terminal (stdin/stdout)
:::

## AI Agent → CLI Interface

The agent invokes the CLI via Bash tool calls as instructed by the SKILL.md. It runs
`arc42 validate` to confirm its edits are clean and `arc42 get` to discover existing
elements before adding new ones.

:::interface
id: if-agent-cli
title: AI Agent → CLI (via Bash tool)
between: actor-agent, bb-cli
protocol: Bash tool call (arc42 commands)
:::

## AI Agent → Skill Interface

The SKILL.md is the conceptual interface between the agent runtime and the toolchain.
It is loaded by the agent before it begins working and provides the authoring convention,
block type reference, and validation workflow. There is no code-level dependency — the
skill is a Markdown file installed by file copy.

:::interface
id: if-agent-skill
title: AI Agent → Skill
between: actor-agent, bb-skill
protocol: SKILL.md loaded at agent startup
:::

## CI Pipeline → CLI Interface

The CI pipeline invokes `arc42 validate --format json` as a build step. Exit code 1
triggers a pipeline failure. The JSON output may be parsed for reporting.

:::interface
id: if-ci-cli
title: CI Pipeline → CLI
between: actor-ci, bb-cli
protocol: Shell command / exit code
:::

## Architect → Documentation Workspace

The architect reads and writes `.arc42.md` files directly in their editor, via git,
or during code review — independent of the CLI. The documentation workspace is the
primary human-readable artifact of the toolchain.

:::interface
id: if-architect-workspace
title: Architect → Documentation Workspace
between: actor-architect, bb-workspace
protocol: Plain text / Markdown editor
:::

## AI Agent → Documentation Workspace

The AI agent reads and writes `.arc42.md` files using file Read/Write tools. This is
the primary way the agent authors and updates architecture documentation — the CLI is
used afterwards to validate the result.

:::interface
id: if-agent-workspace
title: AI Agent → Documentation Workspace
between: actor-agent, bb-workspace
protocol: File Read/Write tools
:::
