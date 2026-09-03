# Quality Requirements

The arc42-language toolchain must satisfy the following quality requirements.
They drive the key architectural decisions in this codebase and are referenced
from the decision records.

## 10.1 Quality Goals

## Human Readability First

Architecture documentation is fundamentally about communicating across people and teams.
A format that is only machine-readable has failed at its primary job. The DSL must feel
natural to write and read without tooling — Markdown viewers, editors without plugins,
and plain text all render it usefully.

:::quality-goal
id: qg-readability
title: Human Readability First
priority: high
:::

## Agent Writability

AI agents are first-class authors of architecture documentation. The format must be
simple enough that agents can produce valid, well-structured files without handholding
or complex tooling. Overly complex syntax, deep nesting, or implicit conventions break
agent-authored content.

:::quality-goal
id: qg-agent-writability
title: Agent Writability
priority: high
:::

## Consistency Verifiability

The value of structured documentation is the ability to verify that it is internally
consistent. Broken references, orphaned concepts, unaddressed quality goals — these
should be caught automatically, not discovered by a reviewer weeks later.

:::quality-goal
id: qg-verifiability
title: Consistency Verifiability
priority: high
:::

## Extensibility

The rule set and block types will grow. New validation rules must be addable without
touching the parser or the existing rule implementations. New block types must be
addable without changing the validation engine.

:::quality-goal
id: qg-extensibility
title: Extensibility
priority: medium
:::

## CLI Usability for Agents and CI

The CLI is the primary interface for both AI agents and CI pipelines. It must be
scriptable, produce stable JSON output, and use conventional exit codes. No interactive
prompts, no auto-detection magic that changes output based on terminal state.

:::quality-goal
id: qg-cli-usability
title: CLI Usability for Agents and CI
priority: medium
:::

## 10.2 Quality Scenarios

## Readability — Unfamiliar Architect Scenario

An architect with no prior knowledge of the tooling should be able to read a workspace
and understand the architecture without running any commands. The DSL syntax and Markdown
rendering must be self-explanatory.

:::quality-scenario
id: qs-readability-unfamiliar
title: Unfamiliar Architect Reads Workspace
quality: qg-readability
stimulus: An architect unfamiliar with the tooling opens a .arc42.md file in any Markdown viewer
response: The architect understands the system's structure, quality goals, and key decisions
metric: No CLI or tooling required; architecture intent is clear from prose and block headers alone
:::

## Agent Writability — Zero-Error Workspace Scenario

An agent given only the block syntax reference and the arc42 rules output should be able
to produce a valid, zero-error workspace. If the format requires trial-and-error or
undocumented conventions, it has failed this goal.

:::quality-scenario
id: qs-agent-writability-from-scratch
title: Agent Produces Valid Workspace From Scratch
quality: qg-agent-writability
stimulus: An agent receives the block syntax reference and arc42 rules output as context
response: The agent produces a .arc42.md workspace with correct block syntax and valid references
metric: arc42 validate reports zero errors on the agent-produced workspace
:::

## Verifiability — Diagnostic Accuracy Scenario

Running validation on a workspace with known violations must produce one diagnostic per
violation with the correct file, line, severity, and code. No false positives and no
missed violations for the covered rule set.

:::quality-scenario
id: qs-verifiability-accuracy
title: Validation Produces Accurate Diagnostics
quality: qg-verifiability
stimulus: A workspace contains a broken reference, a missing required attribute, and a stale proposed decision
response: arc42 validate emits exactly one diagnostic per violation
metric: Each diagnostic has the correct file, line number (±0), severity, and rule code
:::

## Extensibility — New Rule Without Touching Core Scenario

Adding a new validation rule must not require changes to the parser, builder, or any
existing rule implementation. The rule index is the only file outside the new rule file
that needs to change.

:::quality-scenario
id: qs-extensibility-new-rule
title: New Rule Added Without Modifying Core
quality: qg-extensibility
stimulus: A developer adds a new validation rule for a previously unchecked condition
response: The rule is active and produces correct diagnostics
metric: Only two files change: the new rule file and rules/index.ts
:::

## CLI Usability — JSON Output Scenario

The CLI must produce stable, parseable JSON regardless of whether it is run in a terminal
or piped. Exit codes must be deterministic and conventional.

:::quality-scenario
id: qs-cli-json-output
title: JSON Output Is Always Valid
quality: qg-cli-usability
stimulus: arc42 validate --format json is run in a non-TTY context (CI pipeline)
response: Valid JSON is emitted to stdout; nothing else
metric: Output parses with JSON.parse() with zero errors; exit code 1 when errors exist, 0 otherwise
:::
