# Risks and Technical Debt

Arc42 chapter 11: document known risks and areas of technical debt.
Each risk has a severity and should have a mitigation strategy. Even if the mitigation is
"accepted without action", documenting it shows the team made a conscious choice.
Link risks to architecture decisions via the `addresses` field on a decision in chapter 9.

Severity values: `high` (could jeopardise the project/product), `medium` (significant impact
but manageable), `low` (minor impact, acceptable without immediate action).

## Single Database Per Service Not Yet Enforced

Several services currently share the same database instance for convenience.
This creates coupling at the data layer and means a slow query in one service can degrade
all other services on that instance. It also complicates independent deployability.

The `mitigation` field describes how the team plans to address this risk or why it is accepted
as-is. A missing mitigation triggers rule W009.

:::risk
id: risk-shared-db
title: Services Share a Database Instance
severity: high
mitigation: Migrate each service to its own database instance as part of the Q3 infrastructure sprint. Track in issue #142.
:::

## No Automated Performance Regression Tests

The performance quality goal has no automated gate in CI. Performance regressions can be
introduced without detection until a production incident occurs.

:::risk
id: risk-no-perf-tests
title: No Automated Performance Regression Tests
severity: medium
mitigation: Add k6 load test suite as a nightly CI job with a p95 threshold gate. Accepted risk until after the 2025-10 release.
:::
