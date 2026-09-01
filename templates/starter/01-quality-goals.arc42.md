# Quality Goals

<!--
Arc42 chapter 1. Capture the top three to five quality goals that drive the architecture.
Quality goals are non-functional requirements whose fulfilment is of highest importance to
your major stakeholders. They are not project goals — they describe properties the running
system must exhibit.

Focus on what matters most: if you had to choose between conflicting requirements, these
goals tell you which wins. Base them on ISO 25010 characteristics: performance efficiency,
reliability, security, maintainability, usability, portability, compatibility.

Make each goal concrete and testable. A vague goal like "the system should be fast" gives
architects no guidance. A scenario that names a stimulus, a response, and a measurable
threshold is far more useful.

For each goal, write a ## section with a prose paragraph explaining why this quality
matters for your system and which stakeholders care about it, followed by a DSL block.

See https://docs.arc42.org/section-1/ for further guidance.

Example:

## Performance

The system must handle peak load without degrading the user experience.
Response time directly affects user retention and is a contractual obligation
with our enterprise customers.

:::quality-goal
id: qg-performance
title: Performance
priority: high
scenario: Under peak load (1000 concurrent users) the p95 response time stays below 500ms
:::
-->
