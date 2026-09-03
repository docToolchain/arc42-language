# Risks and Technical Debt

<!--
Arc42 chapter 11. Document known risks and areas of technical debt ordered by priority.
Risk management is about making technical risks visible to the people who need to act on them.

A risk is a known threat whose probability or impact has not yet been fully mitigated.
Technical debt is a shortcut taken consciously or accidentally whose cost will have to be
paid later. Both belong here.

For each risk or debt item, write a ## section with a prose paragraph describing the risk,
its cause, its potential impact, and the current situation, followed by a DSL block.

The `mitigation` field describes the planned or accepted response. Even "accepted without
action until X" is a valid mitigation — it shows the team made a conscious choice.

Order entries by priority — highest risk first.

See https://docs.arc42.org/section-11/ for further guidance.

Example:

## No Automated Performance Regression Tests

The performance quality goal has no automated gate in CI. Performance regressions can be
introduced without detection until a production incident occurs.

```arc42
:::risk
id: risk-no-perf-tests
title: No Automated Performance Regression Tests
probability: medium
impact: high
mitigation: Add k6 load test suite as a nightly CI job with a p95 threshold gate.
:::
```
-->
