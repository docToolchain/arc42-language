# Building Blocks

The bookstore backend follows a service-oriented decomposition. Each service owns its data and exposes a well-defined HTTP/JSON interface. The API Gateway is the single entry point for all external clients — it routes requests to the appropriate service but does not contain business logic.

## API Gateway

The gateway is the single entry point for all external traffic. It terminates TLS, validates JWT tokens, enforces rate limits, and routes requests to the appropriate downstream service. No business logic lives here — the gateway is a pure infrastructure component. It rejects unauthenticated requests before they reach any business service (except for public endpoints like catalog search and login).

The gateway propagates a trace identifier on every request. If the incoming request carries an `X-Trace-Id` header, the gateway preserves it; otherwise, it generates a new one. This trace id flows through all downstream calls and appears in every log entry.

```arc42
:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx
implements: concept-logging, concept-auth, concept-error-handling
:::
```

## Catalog Service

The Catalog Service owns all product data: titles, authors, ISBNs, prices, cover image references, categories, and real-time inventory counts. It is the only service that writes to the catalog database. The service exposes endpoints for full-text search, category browsing, and individual book detail retrieval.

Search and detail responses are served from Redis cache whenever possible. Cache misses fall through to PostgreSQL, and the result is written back to the cache. When an administrator updates catalog data, the service publishes a cache invalidation event so stale data is evicted within seconds. This caching strategy is critical for meeting the 200ms p95 search latency target.

```arc42
:::building-block
id: bb-catalog-service
title: Catalog Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling, concept-cache-invalidation, concept-data-ownership
:::
```

## Order Service

The Order Service manages the full order lifecycle: shopping cart persistence, checkout orchestration, payment authorization via the external payment processor, and order history retrieval. It publishes domain events (OrderPlaced, OrderShipped, OrderCancelled) to the message queue for downstream consumers.

At checkout time, the Order Service snapshots the relevant product data from the Catalog Service and stores it in the order record. This denormalization means the order history is independent of future catalog changes — a book's price change does not retroactively alter past orders.

The Order Service is the only component that communicates with the external payment processor. It handles the synchronous authorization call during checkout and processes asynchronous webhook callbacks for payment confirmation and failure.

```arc42
:::building-block
id: bb-order-service
title: Order Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling, concept-auth, concept-data-ownership
:::
```

## Auth Service

The Auth Service handles customer registration, credential verification, and JWT token issuance. On successful login, it returns a signed JWT containing the user's identity and roles. It publishes its public key through a well-known endpoint so that other services and the API Gateway can validate tokens locally without making runtime calls to Auth.

Token expiry is set to 15 minutes. A refresh token flow allows clients to obtain new access tokens without re-entering credentials. The Auth Service is the only component that accesses the user credential store.

```arc42
:::building-block
id: bb-auth-service
title: Auth Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling, concept-auth, concept-data-ownership
:::
```

## Notification Service

The Notification Service consumes order events from the message queue and delivers transactional messages to customers. It supports two channels: email (via AWS SES) and SMS (via AWS SNS). Message content is generated from templates populated with order data.

The service operates entirely asynchronously. It does not participate in the checkout flow — it reacts to events after the fact. If delivery fails, messages are retried with exponential backoff. Persistent delivery failures are logged and surfaced through alerting.

```arc42
:::building-block
id: bb-notification-service
title: Notification Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::
```

## Message Queue

An SQS-based message queue that decouples the Order Service from the Notification Service. The Order Service publishes domain events (OrderPlaced, OrderShipped, OrderCancelled) to the queue. The Notification Service consumes these events and triggers the appropriate notifications.

The queue provides at-least-once delivery. The Notification Service handles duplicate events idempotently by tracking processed event identifiers. Dead-letter queue configuration captures events that fail repeatedly for manual investigation.

```arc42
:::building-block
id: bb-message-queue
title: Message Queue
technology: AWS SQS
implements: concept-logging
:::
```

## Catalog Database

A dedicated PostgreSQL database for the Catalog Service. It stores products, categories, authors, inventory levels, and search indices. No other service reads from or writes to this database directly — all access goes through the Catalog Service API.

Full-text search is handled by PostgreSQL's built-in text search capabilities, augmented by GIN indices for fast lookup. This avoids the operational overhead of a separate search engine like Elasticsearch for the current catalog size (under 500,000 titles).

```arc42
:::building-block
id: bb-catalog-db
title: Catalog Database
technology: PostgreSQL 16
implements: concept-logging
:::
```

## Order Database

A dedicated PostgreSQL database for the Order Service. It stores orders, line items, payment references, shopping cart state, and denormalized product snapshots captured at checkout time. The Order Service is the sole reader and writer.

Order data includes payment processor reference identifiers but never stores card numbers or other sensitive payment instrument data — that lives exclusively at Stripe.

```arc42
:::building-block
id: bb-order-db
title: Order Database
technology: PostgreSQL 16
implements: concept-logging
:::
```

## Auth Database

A dedicated PostgreSQL database for the Auth Service. It stores user credentials (bcrypt-hashed passwords), roles, refresh token records, and account metadata. This is the most security-sensitive data store in the system; access is restricted to the Auth Service only.

```arc42
:::building-block
id: bb-auth-db
title: Auth Database
technology: PostgreSQL 16
implements: concept-logging
:::
```

## Response Cache

A Redis instance that fronts the Catalog Service for read-heavy endpoints: catalog search and book detail retrieval. Cache entries have a 60-second TTL as a safety net, but primary invalidation is event-driven — catalog writes trigger immediate eviction of affected keys.

The cache is a performance optimization, not a data store. If Redis is unavailable, the Catalog Service falls back to serving directly from PostgreSQL. Response times will degrade but the system remains functional.

```arc42
:::building-block
id: bb-cache
title: Response Cache
technology: Redis 7
implements: concept-logging, concept-cache-invalidation
:::
```

---

## Interfaces

### Gateway → Catalog Service

The primary read path for product data. The gateway forwards all `/catalog/**` requests to the Catalog Service after JWT validation. Public endpoints (search, browse, detail) do not require authentication; admin endpoints (create, update, delete) require an admin role.

```arc42
:::interface
id: if-gateway-catalog
title: Gateway → Catalog Service
between: bb-api-gateway, bb-catalog-service
protocol: HTTP/JSON
:::
```

### Gateway → Order Service

The order management path. The gateway forwards all `/cart/**` and `/orders/**` requests to the Order Service. All endpoints require authentication — there are no anonymous order operations.

```arc42
:::interface
id: if-gateway-order
title: Gateway → Order Service
between: bb-api-gateway, bb-order-service
protocol: HTTP/JSON
:::
```

### Gateway → Auth Service

Used for login, registration, token refresh, and public key retrieval. Login and registration are unauthenticated; token refresh requires a valid refresh token. The gateway also calls the Auth Service's public key endpoint at startup to configure local JWT validation.

```arc42
:::interface
id: if-gateway-auth
title: Gateway → Auth Service
between: bb-api-gateway, bb-auth-service
protocol: HTTP/JSON
:::
```

### Catalog Service → Catalog Database

All catalog reads and writes go through this connection. The Catalog Service manages a connection pool; the database is not directly accessible from outside the service boundary.

```arc42
:::interface
id: if-catalog-db
title: Catalog Service → Catalog Database
between: bb-catalog-service, bb-catalog-db
protocol: PostgreSQL wire protocol (TLS)
:::
```

### Catalog Service → Response Cache

The Catalog Service checks Redis before querying the database for search and detail requests. Cache misses fall through to PostgreSQL and the result is written back. Catalog writes trigger invalidation of affected cache keys.

```arc42
:::interface
id: if-catalog-cache
title: Catalog Service → Response Cache
between: bb-catalog-service, bb-cache
protocol: Redis protocol (RESP3)
:::
```

### Order Service → Order Database

All order reads and writes go through this connection. The Order Service is the sole writer to the order schema. Connection pooling and query timeout management are handled by the service.

```arc42
:::interface
id: if-order-db
title: Order Service → Order Database
between: bb-order-service, bb-order-db
protocol: PostgreSQL wire protocol (TLS)
:::
```

### Order Service → Catalog Service

During checkout, the Order Service calls the Catalog Service to fetch current product details and verify stock availability. This is a synchronous call on the checkout path — the fetched data is snapshotted into the order record.

```arc42
:::interface
id: if-order-catalog
title: Order Service → Catalog Service
between: bb-order-service, bb-catalog-service
protocol: HTTP/JSON (internal)
:::
```

### Order Service → Message Queue

The Order Service publishes domain events to the message queue after significant state transitions: order placed, order shipped, order cancelled. Events are published asynchronously after the database transaction commits.

```arc42
:::interface
id: if-order-queue
title: Order Service → Message Queue
between: bb-order-service, bb-message-queue
protocol: AWS SQS API (HTTPS)
:::
```

### Auth Service → Auth Database

All credential and token operations go through this connection. The Auth Service is the sole accessor of the auth database. Queries are parameterized to prevent injection; connection encryption is enforced.

```arc42
:::interface
id: if-auth-db
title: Auth Service → Auth Database
between: bb-auth-service, bb-auth-db
protocol: PostgreSQL wire protocol (TLS)
:::
```

### Notification Service → Message Queue

The Notification Service polls the message queue for order events. It processes each event by selecting the appropriate notification template, rendering the message, and dispatching it through the relevant channel (email or SMS).

```arc42
:::interface
id: if-notify-queue
title: Notification Service → Message Queue
between: bb-notification-service, bb-message-queue
protocol: AWS SQS API (HTTPS)
:::
```
