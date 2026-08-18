# Quality Goals

Arc42 chapter 1: capture the top 3–5 quality goals that drive the architecture.
Quality goals are the non-functional requirements that constrain and shape every significant
architectural decision. Each goal gets its own section with a brief explanation of why it matters
and a DSL block that makes it machine-readable.

## Performance

The system must respond to user-facing requests within the time budget expected at peak load.
This goal drives caching, async processing, and service decomposition decisions.

Priority is `high` — performance is required, not aspirational. The `scenario` field holds an
example scenario in quality-attribute-scenario format (stimulus → response → measure). Use the
`addresses` field on a decision to link back to this goal.

:::quality-goal
id: qg-performance
title: Performance
priority: high
scenario: Under peak load (1000 concurrent users) the p95 response time for user-facing operations stays below 500ms
:::

## Modifiability

Individual components can be changed or replaced without cascading impact across the system.
This goal drives the use of well-defined interfaces and the single-responsibility principle.

Priority is `medium` — important but not the primary constraint shaping day-to-day decisions.

:::quality-goal
id: qg-modifiability
title: Modifiability
priority: medium
scenario: A developer can change the persistence layer of a single service and deploy it within one working day without touching other services
:::

## Security

The system protects user data and prevents unauthorised access to write operations.
This goal drives authentication, authorisation, and data-at-rest encryption decisions.

:::quality-goal
id: qg-security
title: Security
priority: high
scenario: All write endpoints reject requests without a valid auth token; token validation completes in under 5ms without network calls
:::
