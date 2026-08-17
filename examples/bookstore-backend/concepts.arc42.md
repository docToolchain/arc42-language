# Cross-cutting Concepts

These concepts cut across multiple building blocks. Each building block declares which concepts
it implements via the `implements:` attribute, making coverage and gaps explicit and validatable.

## Structured Logging

Every service emits structured JSON log entries on every request and significant internal event.
Log entries include `traceId`, `service`, `duration`, `outcome`, and `timestamp` fields.
The `traceId` is propagated via the `X-Trace-Id` HTTP header — services copy it from incoming
requests and attach it to all outbound calls and log entries. Log shipping to the aggregator
is handled by a sidecar; no service makes direct network calls for logging.

:::concept
id: concept-logging
title: Structured Logging
category: observability
:::

## Authentication and Authorization

All write endpoints require a valid JWT bearer token. The Auth Service issues tokens on login;
all other services validate tokens locally using the shared public key fetched at startup.
Token validation is stateless — no service calls Auth at request time. This keeps latency low
and avoids a single point of failure on the hot path.

Token expiry is set to 15 minutes with a refresh token flow to mitigate the inability to
revoke tokens before expiry.

:::concept
id: concept-auth
title: Authentication and Authorization
category: security
:::

## Error Handling

All services return RFC 7807 `problem+json` error responses (`Content-Type: application/problem+json`).
Unexpected exceptions are caught at the framework middleware layer, logged with full context
including the `traceId`, and returned as HTTP 500 with a correlation id in the response body.
Business errors (validation failures, not found, conflicts) are 4xx responses with a
machine-readable `type` URI field so clients can handle them programmatically.

:::concept
id: concept-error-handling
title: Error Handling
category: error-handling
:::
