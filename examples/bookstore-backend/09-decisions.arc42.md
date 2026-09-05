# Architecture Decisions

This chapter captures the key architecture decisions as Architecture Decision Records (ADRs). Each decision references the quality goals or constraints it addresses, making traceability from goal to decision explicit and machine-verifiable.

## REST over HTTP/JSON for External APIs

We evaluated REST, gRPC, and GraphQL for the external-facing API surface. The client landscape is diverse (web SPA, mobile apps, potential third-party integrations), the team has strong REST experience, and our current query patterns are simple enough that GraphQL's flexibility would not pay for its complexity. gRPC would require protobuf tooling across all clients, including the mobile team, which has no gRPC experience.

REST was the pragmatic choice: it aligns with the team's skills, satisfies the constraint that mobile clients require REST, and produces human-readable request/response pairs that simplify debugging and observability.

Rejected alternatives:

- GraphQL — flexibility not needed for our query patterns; adds schema complexity and makes caching harder
- gRPC — excellent for internal service-to-service communication but impractical for browser clients without a proxy layer

```arc42
:::decision
id: dec-rest-api
title: Use REST over HTTP/JSON for all external-facing APIs
status: accepted
date: 2026-01-10
addresses: qg-maintainability, qg-observability, con-rest-api
:::
```

## Stateless JWT Authentication

We chose stateless JWT tokens over server-side sessions (database or Redis-backed) to avoid a network round-trip to the Auth Service on every authenticated request. Token validation happens locally at the gateway and in each service using the Auth Service's public key.

This is critical for the 200ms p95 target — eliminating the auth round-trip removes 10-30ms from every authenticated request. The tradeoff is that tokens cannot be revoked before expiry. This is mitigated by a short 15-minute expiry and single-use refresh tokens. If immediate revocation becomes a hard requirement (e.g., for compliance), a Redis-backed token blocklist can be added without changing the validation contract.

Rejected alternatives:

- Server-side sessions with Redis — adds a shared dependency on the critical path; Redis failure would block all authenticated requests
- OAuth2 with external identity provider — planned for phase two but not yet needed; current user base is direct customers only

```arc42
:::decision
id: dec-jwt-auth
title: Use stateless JWT tokens for authentication
status: accepted
date: 2026-01-15
addresses: qg-security, qg-performance, con-jwt-auth
:::
```

## PostgreSQL for All Persistent Storage

We considered PostgreSQL, MongoDB, and DynamoDB. The team has deep PostgreSQL expertise, our data model is relational (products, orders, line items, users), and using a single database technology reduces operational complexity — one backup strategy, one monitoring setup, one set of performance tuning skills.

PostgreSQL's JSONB support covers the flexible metadata use cases (book attributes, category hierarchies) that initially made MongoDB attractive. Its built-in full-text search with GIN indices handles the catalog search workload at our current scale without requiring a separate search engine.

DynamoDB was rejected due to the learning curve for the team and vendor lock-in risk. The operations team's existing PostgreSQL runbooks and toolchain would need to be rebuilt from scratch.

Rejected alternatives:

- MongoDB — flexible schema not needed; team would need to learn a new operational toolchain
- DynamoDB — vendor lock-in; capacity management complexity; team unfamiliar with NoSQL data modeling

```arc42
:::decision
id: dec-postgres
title: Use PostgreSQL for all persistent storage
status: accepted
date: 2026-01-15
addresses: qg-maintainability, con-postgresql
:::
```

## Redis Cache for Catalog Read Traffic

Catalog data changes on the order of hours but is read thousands of times per minute. A Redis cache with event-driven invalidation in front of the Catalog Service reduces database load by approximately 80% under production-like load tests, bringing p95 response times comfortably within the 200ms target.

The cache TTL is 60 seconds as a safety net; primary invalidation is event-driven. Cache misses fall through to the database transparently. If Redis is unavailable, the system degrades gracefully — responses are slower but correct.

Write-through caching was considered but rejected — the added write latency is not acceptable for the admin update flow, and invalidation-based caching is simpler to reason about.

Rejected alternatives:

- No caching (direct database queries) — p95 response times exceeded 500ms under load; unacceptable
- Write-through cache — adds latency to writes; more complex consistency model with no practical benefit for our read-heavy workload
- CDN-level caching — catalog data is personalized (stock levels, pricing); CDN cache keys would be impractical

```arc42
:::decision
id: dec-redis-cache
title: Cache catalog read traffic in Redis
status: accepted
date: 2026-02-01
addresses: qg-performance
:::
```

## Asynchronous Notifications via Message Queue

Order notifications (email, SMS) are delivered asynchronously via a message queue rather than synchronously during the checkout flow. This keeps the checkout response time fast (payment authorization is already the bottleneck) and decouples the order flow from the notification infrastructure.

If email or SMS delivery is temporarily unavailable, the customer's order still succeeds. Messages are retried with exponential backoff. A dead-letter queue captures persistently failing messages for manual investigation.

SQS was chosen over SNS fan-out or a self-hosted message broker (RabbitMQ, Kafka) because SQS is fully managed, requires no infrastructure provisioning, and the current notification volume (under 10,000 messages per day) does not justify the operational overhead of a more complex messaging system.

Rejected alternatives:

- Synchronous notification during checkout — adds 500-2000ms to checkout latency; email/SMS failures would block order placement
- SNS fan-out — adds routing complexity we don't need yet; only one consumer exists today
- Self-hosted RabbitMQ/Kafka — operational overhead for the team; throughput requirements don't justify it

```arc42
:::decision
id: dec-async-notifications
title: Deliver notifications asynchronously via SQS message queue
status: accepted
date: 2026-02-10
addresses: qg-performance, qg-availability
:::
```

## Structured JSON Logging with Trace IDs

Plain-text logs are not machine-queryable and cross-service request tracing requires manual log correlation. We adopted structured JSON logging with a shared `traceId` field propagated via the `X-Trace-Id` HTTP header. This enables cross-service request tracing without a full distributed tracing infrastructure (Jaeger, Zipkin).

All services write structured logs to stdout. The container runtime captures logs and ships them to CloudWatch Logs. A single query filtering by `traceId` reveals the complete request flow across all services.

OpenTelemetry was evaluated but deferred — it can be added later as a structured-log exporter without changing the logging contract established here. The current approach meets the observability quality goal at lower operational cost.

Rejected alternatives:

- Plain-text logging — not queryable; cross-service correlation requires manual effort
- Full OpenTelemetry with Jaeger — excellent capability but adds operational complexity (trace collector, storage, UI); deferred to phase two

```arc42
:::decision
id: dec-structured-logging
title: Adopt structured JSON logging with trace IDs across all services
status: accepted
date: 2026-02-10
addresses: qg-observability
:::
```

## Service-Oriented Decomposition with Five Services

We evaluated a monolithic architecture, a microservices architecture with fine-grained services, and a middle-ground service-oriented approach with coarse-grained services aligned to business capabilities.

With six engineers, operating more than five services would spread the team too thin. A monolith would work initially but would constrain independent deployment and fault isolation as the system grows. Five services (Gateway, Catalog, Order, Auth, Notification) is the smallest decomposition that provides meaningful isolation between business capabilities while remaining manageable for the team.

Each service owns its data and communicates with other services only through defined interfaces. This allows independent deployment, independent scaling, and fault isolation — a crash in the Notification Service does not affect checkout.

Rejected alternatives:

- Monolith — fast to start but limits independent deployment and fault isolation; harder to scale individual capabilities
- Fine-grained microservices (8+ services) — too many services for a six-person team; operational overhead outweighs the benefits

```arc42
:::decision
id: dec-service-decomposition
title: Decompose into five services aligned to business capabilities
status: accepted
date: 2026-01-05
addresses: qg-maintainability, qg-availability, con-team-size
:::
```

## AWS ECS Fargate for Container Orchestration

We evaluated ECS Fargate, EKS (managed Kubernetes), and plain EC2 with Docker Compose. Fargate eliminates server management entirely — no patching, no capacity planning for the underlying hosts. The team has no Kubernetes experience, and the operational overhead of managing an EKS cluster is not justified for five services.

ECS Fargate integrates natively with the other AWS services we use (ALB, RDS, ElastiCache, SQS, CloudWatch) and supports the deployment patterns we need (rolling updates, health checks, auto-scaling).

Rejected alternatives:

- EKS (Kubernetes) — powerful but steep learning curve; operational overhead unjustified for our scale
- EC2 with Docker Compose — no auto-scaling, no health-check-based deployment, manual host management

```arc42
:::decision
id: dec-ecs-fargate
title: Use AWS ECS Fargate for container orchestration
status: accepted
date: 2026-01-20
addresses: qg-maintainability, con-aws, con-data-residency
:::
```
