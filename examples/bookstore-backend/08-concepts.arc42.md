# Cross-cutting Concepts

These concepts cut across multiple building blocks. Each building block declares which concepts it implements via the `implements:` attribute, making coverage and gaps explicit and validatable.

## Structured Logging

Every service emits structured JSON log entries on every request and significant internal event. Log entries include `traceId`, `service`, `duration`, `outcome`, and `timestamp` fields. The `traceId` is propagated via the `X-Trace-Id` HTTP header — services copy it from incoming requests and attach it to all outbound calls and log entries.

The API Gateway generates a new trace id if the incoming request does not carry one. All downstream services propagate the same trace id through internal HTTP calls and into queue messages. This enables cross-service request tracing without a full distributed tracing infrastructure.

Log shipping to the centralized aggregator (CloudWatch Logs) is handled by the container runtime's log driver. No service makes direct network calls for logging — log entries are written to stdout and captured by the infrastructure.

```arc42
:::concept
id: concept-logging
title: Structured Logging
category: observability
:::
```

## Authentication and Authorization

All mutating endpoints and customer-specific read endpoints require a valid JWT bearer token. The Auth Service issues tokens on login; all other services validate tokens locally using the Auth Service's public key, fetched at startup and refreshed periodically.

Token validation is stateless — no service calls the Auth Service at request time. This keeps latency low and avoids a single point of failure on the hot path. The API Gateway performs the initial validation and injects the authenticated user's identity into a request header for downstream services.

Authorization is role-based. Two roles exist: `customer` and `admin`. The gateway enforces role requirements at the route level. Services trust the identity propagated by the gateway but perform their own authorization checks for sensitive operations (e.g., a customer can only access their own orders).

Token expiry is set to 15 minutes with a refresh token flow. Refresh tokens are single-use — each refresh issues a new pair and invalidates the old refresh token. If immediate token revocation becomes a hard requirement (e.g., for compliance), a Redis-backed token blocklist can be added without changing the validation flow.

```arc42
:::concept
id: concept-auth
title: Authentication and Authorization
category: security
:::
```

## Error Handling

All services return RFC 7807 `problem+json` error responses (`Content-Type: application/problem+json`). Every error response includes a machine-readable `type` URI, a human-readable `title`, the HTTP status code, and a `traceId` for correlation with server-side logs.

Unexpected exceptions are caught at the framework middleware layer, logged with full context including the trace id and request metadata, and returned as HTTP 500 with a generic message. Internal error details are never exposed to clients.

Business errors (validation failures, not found, conflicts, insufficient stock) are returned as 4xx responses with a specific `type` URI so clients can handle them programmatically. For example, an out-of-stock error during checkout carries a `type` of `/problems/insufficient-stock` and includes the affected item identifiers in the response body.

```arc42
:::concept
id: concept-error-handling
title: Error Handling
category: reliability
:::
```

## Cache Invalidation

The Catalog Service uses a write-through invalidation strategy for the Response Cache. When catalog data is modified (create, update, or delete operations), the service invalidates affected cache entries immediately after the database transaction commits.

Invalidation targets both specific item keys (book detail entries) and related collection keys (search result pages that may contain the modified item). A conservative approach is used for collection invalidation — all search result pages are evicted on any catalog write, since determining which pages are affected would require maintaining a reverse index that adds complexity without proportional benefit.

The 60-second TTL on cache entries acts as a safety net for edge cases where event-driven invalidation might miss an entry. This TTL is not the primary invalidation mechanism — it exists to bound the maximum staleness in case of a bug.

```arc42
:::concept
id: concept-cache-invalidation
title: Cache Invalidation
category: performance
:::
```

## Data Ownership and Isolation

Each service owns its data exclusively. No service reads from or writes to another service's database. All cross-service data access happens through the owning service's API.

When data needs to be preserved across service boundaries (e.g., product details in an order record), it is denormalized at the point of capture. The Order Service snapshots product data at checkout time so that order history is independent of future catalog changes.

This strict ownership model prevents hidden coupling through shared databases, allows each service to evolve its schema independently, and makes the failure domain of each service self-contained.

```arc42
:::concept
id: concept-data-ownership
title: Data Ownership and Isolation
category: architecture
:::
```
