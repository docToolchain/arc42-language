# Architecture Decisions

<!--
Arc42 chapter 9. Document the significant architecture decisions as Architecture Decision
Records (ADRs). Capture any choice that was expensive, risky, or that future maintainers
will wonder about.

Avoid redundancy with section 4 (solution strategy) — refer to it for the highest-level
choices and use this chapter for detail and rationale.

For each decision, write a ## section with a prose paragraph explaining the context,
the alternatives considered, and the rationale for the chosen option, followed by a DSL block.
Document rejected alternatives so future readers understand what was considered.

Status values:
  proposed   — under discussion, not yet in force
  accepted   — in force
  deprecated — no longer recommended but not yet replaced
  superseded — replaced by another decision

When a new decision replaces an old one, set status: superseded on the old decision
and add supersedes: <old-id> on the new decision.

The `date` field should be ISO 8601 (YYYY-MM-DD).
The `addresses` field links to quality goals and constraints this decision responds to.

See https://docs.arc42.org/section-9/ for further guidance.

Example:

## Stateless Token Authentication

The team evaluated session-based (server-side store) and token-based (stateless) authentication.
Stateless tokens were chosen to avoid a shared session store that would introduce a single point
of failure and complicate horizontal scaling.

:::decision
id: dec-auth-stateless
title: Stateless Token Authentication
status: accepted
date: 2025-07-01
addresses: qg-security, qg-performance
:::

To supersede a decision, mark the old one and point to it from the new one:

:::decision
id: dec-auth-old
title: Session-based Authentication
status: superseded
date: 2024-01-15
:::

:::decision
id: dec-auth-new
title: OAuth2 Token Authentication
status: accepted
date: 2025-09-01
supersedes: dec-auth-old
:::
-->
