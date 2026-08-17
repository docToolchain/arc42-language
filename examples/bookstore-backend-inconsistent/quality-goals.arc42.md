# Quality Goals

:::quality-goal
id: qg-performance
title: Performance
priority: high
scenario: The catalog search API returns results within 300ms at p95 under 500 concurrent users.
:::

:::quality-goal
id: qg-security
title: Security
priority: high
scenario: All customer data is encrypted in transit and at rest; authentication is required for all write operations.
:::

:::quality-goal
id: qg-maintainability
title: Maintainability
priority: medium
scenario: A new developer can add a new API endpoint without touching more than two components.
:::

:::quality-goal
id: qg-observability
title: Observability
priority: medium
scenario: Every request produces a structured log entry with trace id, duration, and outcome within 5ms overhead.
:::
