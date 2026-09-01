# Cross-cutting Concepts

<!--
Arc42 chapter 8. Document the cross-cutting concerns, patterns, and principles that apply
consistently across multiple building blocks. Concepts form the basis for conceptual integrity —
the consistency and homogeneity of your architecture.

A concept is anything that cuts across component boundaries: security patterns, error handling
strategies, logging conventions, persistence approaches, messaging patterns, deployment
conventions, testing strategies, and so on.

Do not attempt to cover every possible topic. Pick only the concepts that are architecturally
significant for your system — those that building blocks must implement consistently, and where
a central description is more useful than repeating the same text in each building block.

For each concept, write a ## section with a prose paragraph describing the concept, the
decision behind it, and its implications for the building blocks that must implement it,
followed by a DSL block.

Building blocks reference concepts via the `implements` field in chapter 5, making coverage
explicit and verifiable.

See https://docs.arc42.org/section-8/ for further guidance.

Example:

## Structured Logging

Every service emits structured JSON log entries including traceId, service, duration,
outcome, and timestamp. The traceId is propagated via the X-Trace-Id HTTP header
and copied to all outbound calls and log entries.

:::concept
id: concept-logging
title: Structured Logging
category: observability
:::
-->
