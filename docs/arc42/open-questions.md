# Open Questions

The following gaps cannot be fully described from the current source code and branch context.
They are intentionally prose-only; no machine-readable element is invented for an unknown area.

## Chapter 1 — Stakeholders

Which external, operational, and business stakeholders should be included in the quality-goal
prioritisation, beyond the architects, maintainers, agents, and CI users visible in the repository?

## Chapter 3 — Context and Scope

What are the complete external actors, neighbouring systems, and system boundaries for the
arc42-language toolchain? The repository does not define a dedicated context view.

## Chapter 4 — Solution Strategy

Which high-level solution strategies should be documented separately from the individual ADRs?
The current docs capture implementation decisions but not a complete strategy overview.

## Chapter 6 — Runtime View

Which representative runtime scenarios should be documented, including command execution flows,
failure handling, and interactions with the filesystem?

## Chapter 7 — Deployment View

Where and how are the CLI, core package, and installed skill deployed in development, CI, and
agent environments? The source does not define a deployment topology.

## Chapter 10 — Quality Scenarios

Which quality scenarios should be maintained as a prioritised scenario matrix? Current quality
goals carry individual scenario strings, but there is no separate scenario model or catalogue.
