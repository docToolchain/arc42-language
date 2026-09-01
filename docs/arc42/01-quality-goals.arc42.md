# Quality Goals

The arc42-language toolchain must satisfy the following quality goals. They drive the
key architectural decisions in this codebase and are referenced from the decision records.

## Human Readability First

Architecture documentation is fundamentally about communicating across people and teams.
A format that is only machine-readable has failed at its primary job. The DSL must feel
natural to write and read without tooling — Markdown viewers, editors without plugins,
and plain text all render it usefully.

:::quality-goal
id: qg-readability
title: Human Readability First
priority: high
scenario: An architect unfamiliar with the tooling can read a .arc42.md file and understand the architecture without running any commands.
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
scenario: An agent can produce a valid, zero-error .arc42.md workspace from scratch using only the block syntax reference and the arc42 rules output.
:::

## Consistency Verifiability

The value of structured documentation is the ability to verify that it is internally
consistent. Broken references, orphaned concepts, unaddressed quality goals — these
should be caught automatically, not discovered by a reviewer weeks later.

:::quality-goal
id: qg-verifiability
title: Consistency Verifiability
priority: high
scenario: Running arc42 validate on a workspace with a broken reference, a missing required attribute, and a stale proposed decision produces one diagnostic per violation with the correct file, line, severity, and code.
:::

## Extensibility

The rule set and block types will grow. New validation rules must be addable without
touching the parser or the existing rule implementations. New block types must be
addable without changing the validation engine.

:::quality-goal
id: qg-extensibility
title: Extensibility
priority: medium
scenario: A new validation rule can be added by creating one new file and registering it in the rule index — no changes to parser, builder, or existing rules required.
:::

## CLI Usability for Agents and CI

The CLI is the primary interface for both AI agents and CI pipelines. It must be
scriptable, produce stable JSON output, and use conventional exit codes. No interactive
prompts, no auto-detection magic that changes output based on terminal state.

:::quality-goal
id: qg-cli-usability
title: CLI Usability for Agents and CI
priority: medium
scenario: arc42 validate --format json produces valid JSON on stdout regardless of terminal context; exit code 1 when errors exist, 0 when clean.
:::

## Stakeholders

The stakeholders are architects, maintainers, and agents. Architects care about communicating and
evolving the system's design, maintainers care about keeping the toolchain consistent and reliable,
and agents care about understanding and updating the architecture correctly.
