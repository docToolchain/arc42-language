# Cross-cutting Concepts

Arc42 chapter 8: document the cross-cutting concerns that apply consistently across multiple
building blocks. Each concept captures a design decision, pattern, or technology that cuts
across component boundaries. Building blocks reference concepts via the `implements` field,
making coverage explicit and machine-verifiable.

## Authentication and Authorisation

All write endpoints require a valid JWT bearer token. Services validate tokens locally
using a shared public key — no service calls the auth service at request time.
This keeps validation stateless, low-latency, and resilient to auth service downtime.

The `category` field groups concepts into themes that can be filtered with `arc42 get`.
Common values include `security`, `observability`, `error-handling`, `persistence`,
`messaging`, `deployment`. Choose a value that matches your team's vocabulary.

:::concept
id: concept-auth
title: Authentication and Authorisation
category: security
:::

## Structured Logging

Every service emits structured JSON log entries including `traceId`, `service`, `duration`,
`outcome`, and `timestamp`. The `traceId` is propagated via the `X-Trace-Id` HTTP header
and is copied from incoming requests to all outbound calls and log entries.

:::concept
id: concept-logging
title: Structured Logging
category: observability
:::

## Error Handling

All services return RFC 7807 `problem+json` error responses. Unexpected exceptions are caught
at the framework middleware layer, logged with full context, and returned as HTTP 500 with a
correlation id. Business errors are 4xx responses with a machine-readable `type` URI field.

:::concept
id: concept-error-handling
title: Error Handling
category: error-handling
:::
