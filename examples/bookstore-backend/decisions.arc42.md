# Architecture Decisions

This file captures the key architecture decisions for the bookstore backend as ADRs.
Each decision references the quality goals it addresses, making traceability from goal to
decision explicit and machine-verifiable.

## REST over HTTP/JSON for external APIs

We evaluated REST, gRPC, and GraphQL for the external-facing API surface. The client
landscape is diverse (web SPA, mobile apps, potential third-party integrations), the
team has strong REST experience, and our current query patterns are simple enough that
GraphQL's flexibility would not pay for its complexity. gRPC would require protobuf
tooling across all clients. REST was the pragmatic choice.

:::decision
id: dec-rest-api
title: Use REST over HTTP/JSON for all external-facing APIs
status: accepted
date: 2026-01-10
addresses: qg-maintainability, qg-observability
:::

## Stateless JWT authentication

We chose stateless JWT tokens over server-side sessions (database or Redis-backed) to
avoid a network round-trip to the Auth Service on every authenticated request. This is
critical for the 300ms p95 target in `qg-performance`. The tradeoff is that tokens
cannot be revoked before expiry — mitigated by a short 15-minute expiry and a refresh
token flow. If immediate revocation becomes a hard requirement (e.g. for compliance),
we will add a token blocklist backed by Redis.

:::decision
id: dec-jwt-auth
title: Use stateless JWT tokens for authentication
status: accepted
date: 2026-01-15
addresses: qg-security, qg-performance
:::

## PostgreSQL for all persistent storage

We considered PostgreSQL, MongoDB, and DynamoDB. The team has stronger PostgreSQL
expertise, our data model is largely relational, and using a single database technology
reduces operational complexity (one backup strategy, one monitoring setup, one ORM).
PostgreSQL's JSONB support covers the flexible metadata use cases that initially made
MongoDB attractive. DynamoDB was rejected due to the operational overhead of managing
capacity and the vendor lock-in risk.

:::decision
id: dec-postgres
title: Use PostgreSQL for all persistent storage
status: accepted
date: 2026-01-15
addresses: qg-maintainability
:::

## Redis cache for catalog search results

Catalog data changes on the order of hours but is read thousands of times per minute.
A Redis cache with a 60-second TTL in front of the Catalog Service reduces database
load by approximately 80% under production-like load tests, bringing p95 response times
comfortably within the 300ms target. Cache invalidation is event-driven: catalog writes
publish an invalidation message that the Catalog Service consumes to evict stale keys.
Write-through caching was considered but rejected — the added write latency is not
acceptable for the order flow.

:::decision
id: dec-redis-cache
title: Cache catalog search results in Redis
status: accepted
date: 2026-02-01
addresses: qg-performance
:::

## Structured JSON logging with trace ids

Plain-text logs are not machine-queryable and cross-service request tracing requires
manual log correlation. We adopted structured JSON logging with a shared `traceId`
field propagated via the `X-Trace-Id` HTTP header. This enables cross-service request
tracing without a full distributed tracing infrastructure (Jaeger, Zipkin). OpenTelemetry
was evaluated but deferred — it can be added later as a structured-log exporter without
changing the logging contract established here.

:::decision
id: dec-structured-logging
title: Adopt structured JSON logging with trace ids across all services
status: accepted
date: 2026-02-10
addresses: qg-observability
:::
