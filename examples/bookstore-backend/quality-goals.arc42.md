# Quality Goals

The bookstore backend must satisfy the following quality goals, listed in priority order.
These goals drive the key architecture decisions and are referenced from the decision records below.

## Performance

Slow search kills conversion. The catalog search API must feel instant for the end user.

:::quality-goal
id: qg-performance
title: Performance
priority: high
scenario: The catalog search API returns results within 300ms at p95 under 500 concurrent users.
:::

## Security

The platform handles payment-adjacent data and personal information. Security is non-negotiable.

:::quality-goal
id: qg-security
title: Security
priority: high
scenario: All customer data is encrypted in transit and at rest; authentication is required for all write operations.
:::

## Maintainability

The team is small and the feature roadmap is long. The architecture must not become a bottleneck
for shipping new capabilities.

:::quality-goal
id: qg-maintainability
title: Maintainability
priority: medium
scenario: A new developer can add a new API endpoint without touching more than two components.
:::

## Observability

Incidents must be diagnosable from logs alone — no SSH into production, no guesswork.

:::quality-goal
id: qg-observability
title: Observability
priority: medium
scenario: Every request produces a structured log entry with trace id, duration, and outcome within 5ms overhead.
:::
