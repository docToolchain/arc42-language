# Building Blocks

The bookstore backend follows a service-oriented decomposition. Each service owns its data and exposes a well-defined HTTP/JSON interface. The API Gateway is the single entry point for all external clients — it routes requests to the appropriate service but does not contain business logic.

```arc42
:::diagram
id: bb-view-all
view: building-block
notation: mermaid
:::
```

```mermaid
graph TD
    bb-api-gateway["API Gateway\n(nginx)"]
    bb-catalog-service["Catalog Service\n(Node.js / Express)"]
    bb-order-service["Order Service\n(Node.js / Express)"]
    bb-auth-service["Auth Service\n(Node.js / Express)"]
    bb-notification-service["Notification Service\n(Node.js / Express)"]
    bb-message-queue["Message Queue\n(AWS SQS)"]
    bb-catalog-db["Catalog Database\n(PostgreSQL 16)"]
    bb-order-db["Order Database\n(PostgreSQL 16)"]
    bb-auth-db["Auth Database\n(PostgreSQL 16)"]
    bb-cache["Response Cache\n(Redis 7)"]

    bb-api-gateway -->|"if-gateway-catalog"| bb-catalog-service
    bb-api-gateway -->|"if-gateway-order"| bb-order-service
    bb-api-gateway -->|"if-gateway-auth"| bb-auth-service
    bb-catalog-service -->|"if-catalog-db"| bb-catalog-db
    bb-catalog-service -->|"if-catalog-cache"| bb-cache
    bb-order-service -->|"if-order-db"| bb-order-db
    bb-order-service -->|"if-order-catalog"| bb-catalog-service
    bb-order-service -->|"if-order-queue"| bb-message-queue
    bb-auth-service -->|"if-auth-db"| bb-auth-db
    bb-notification-service -->|"if-notify-queue"| bb-message-queue
```

## API Gateway

The gateway is the single entry point for all external traffic. It terminates TLS, validates JWT tokens, enforces rate limits, and routes requests to the appropriate downstream service. No business logic lives here — the gateway is a pure infrastructure component. It rejects unauthenticated requests before they reach any business service (except for public endpoints like catalog search and login).

The gateway propagates a trace identifier on every request. If the incoming request carries an `X-Trace-Id` header, the gateway preserves it; otherwise, it generates a new one. This trace id flows through all downstream calls and appears in every log entry.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx
implements: concept-logging, concept-auth, concept-error-handling
requires: if-gateway-catalog, if-gateway-order, if-gateway-auth
:::
```

### Bookstore Backend API

The API Gateway provides the same backend API to customer and administrator clients; authorization
determines which operations each consumer may perform.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::
:::interface
id: if-gateway-api
title: Bookstore Backend API
provider: bb-api-gateway
protocol: HTTPS / REST + JSON
:::
```

## Catalog Service

The Catalog Service owns all product data: titles, authors, ISBNs, prices, cover image references, categories, and real-time inventory counts. It is the only service that writes to the catalog database. The service exposes endpoints for full-text search, category browsing, and individual book detail retrieval.

Search and detail responses are served from Redis cache whenever possible. Cache misses fall through to PostgreSQL, and the result is written back to the cache. When an administrator updates catalog data, the service publishes a cache invalidation event so stale data is evicted within seconds. This caching strategy is critical for meeting the 200ms p95 search latency target.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-catalog-service
title: Catalog Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling, concept-cache-invalidation, concept-data-ownership
requires: if-catalog-db, if-catalog-cache
:::
```

### Catalog Service HTTP API

The gateway's catalog request contract and the internal catalog lookup contract are provided by
the Catalog Service.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-gateway-catalog
title: Catalog Service HTTP API
provider: bb-catalog-service
protocol: HTTP/JSON
:::
```

### Catalog Lookup API

The Order Service uses this contract during checkout to read current product details and stock.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-order-catalog
title: Catalog Lookup API
provider: bb-catalog-service
protocol: HTTP/JSON (internal)
:::
```

## Order Service

The Order Service manages the full order lifecycle: shopping cart persistence, checkout orchestration, payment authorization via the external payment processor, and order history retrieval. It publishes domain events (OrderPlaced, OrderShipped, OrderCancelled) to the message queue for downstream consumers.

At checkout time, the Order Service snapshots the relevant product data from the Catalog Service and stores it in the order record. This denormalization means the order history is independent of future catalog changes — a book's price change does not retroactively alter past orders.

The Order Service is the only component that communicates with the external payment processor. It handles the synchronous authorization call during checkout and processes asynchronous webhook callbacks for payment confirmation and failure.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-order-service
title: Order Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling, concept-auth, concept-data-ownership
requires: if-order-db, if-order-catalog, if-order-queue
:::
```

### Order Service → Payment Processor

The Order Service payment contract covers authorization and asynchronous payment lifecycle events.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::
:::interface
id: if-order-payment
title: Order Service → Payment Processor
provider: bb-order-service
protocol: HTTPS / REST (Stripe API v2)
:::
```

### Order Service HTTP API

The gateway's order-management request contract is provided by the Order Service.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-gateway-order
title: Order Service HTTP API
provider: bb-order-service
protocol: HTTP/JSON
:::
```

## Auth Service

The Auth Service handles customer registration, credential verification, and JWT token issuance. On successful login, it returns a signed JWT containing the user's identity and roles. It publishes its public key through a well-known endpoint so that other services and the API Gateway can validate tokens locally without making runtime calls to Auth.

Token expiry is set to 15 minutes. A refresh token flow allows clients to obtain new access tokens without re-entering credentials. The Auth Service is the only component that accesses the user credential store.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-auth-service
title: Auth Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling, concept-auth, concept-data-ownership
requires: if-auth-db
:::
```

### Auth Service HTTP API

The gateway uses this contract for login, registration, token refresh, and public key retrieval.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-gateway-auth
title: Auth Service HTTP API
provider: bb-auth-service
protocol: HTTP/JSON
:::
```

## Notification Service

The Notification Service consumes order events from the message queue and delivers transactional messages to customers. It supports two channels: email (via AWS SES) and SMS (via AWS SNS). Message content is generated from templates populated with order data.

The service operates entirely asynchronously. It does not participate in the checkout flow — it reacts to events after the fact. If delivery fails, messages are retried with exponential backoff. Persistent delivery failures are logged and surfaced through alerting.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-notification-service
title: Notification Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
requires: if-notify-queue
:::
```

### Notification Service → Email Delivery

The Notification Service provides the contract for transactional email delivery.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::
:::interface
id: if-notify-email
title: Notification Service → Email Delivery
provider: bb-notification-service
protocol: HTTPS / AWS SES API
:::
```

### Notification Service → SMS Gateway

The Notification Service provides the contract for transactional SMS delivery.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::
:::interface
id: if-notify-sms
title: Notification Service → SMS Gateway
provider: bb-notification-service
protocol: HTTPS / AWS SNS API
:::
```

## Message Queue

An SQS-based message queue that decouples the Order Service from the Notification Service. The Order Service publishes domain events (OrderPlaced, OrderShipped, OrderCancelled) to the queue. The Notification Service consumes these events and triggers the appropriate notifications.

The queue provides at-least-once delivery. The Notification Service handles duplicate events idempotently by tracking processed event identifiers. Dead-letter queue configuration captures events that fail repeatedly for manual investigation.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-message-queue
title: Message Queue
technology: AWS SQS
implements: concept-logging
:::
```

### Order Events Contract

The Order Service publishes domain events to the queue after significant state transitions.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-order-queue
title: Order Events Contract
provider: bb-message-queue
protocol: AWS SQS API (HTTPS)
:::
```

### Notification Events Contract

The Notification Service consumes order events from the queue asynchronously.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-notify-queue
title: Notification Events Contract
provider: bb-message-queue
protocol: AWS SQS API (HTTPS)
:::
```

## Catalog Database

A dedicated PostgreSQL database for the Catalog Service. It stores products, categories, authors, inventory levels, and search indices. No other service reads from or writes to this database directly — all access goes through the Catalog Service API.

Full-text search is handled by PostgreSQL's built-in text search capabilities, augmented by GIN indices for fast lookup. This avoids the operational overhead of a separate search engine like Elasticsearch for the current catalog size (under 500,000 titles).

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-catalog-db
title: Catalog Database
technology: PostgreSQL 16
implements: concept-logging
:::
```

### Catalog Database Connection

All catalog reads and writes go through this provider-owned database connection.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-catalog-db
title: Catalog Database Connection
provider: bb-catalog-db
protocol: PostgreSQL wire protocol (TLS)
:::
```

## Order Database

A dedicated PostgreSQL database for the Order Service. It stores orders, line items, payment references, shopping cart state, and denormalized product snapshots captured at checkout time. The Order Service is the sole reader and writer.

Order data includes payment processor reference identifiers but never stores card numbers or other sensitive payment instrument data — that lives exclusively at Stripe.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-order-db
title: Order Database
technology: PostgreSQL 16
implements: concept-logging
:::
```

### Order Database Connection

All order reads and writes go through this provider-owned database connection.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-order-db
title: Order Database Connection
provider: bb-order-db
protocol: PostgreSQL wire protocol (TLS)
:::
```

## Auth Database

A dedicated PostgreSQL database for the Auth Service. It stores user credentials (bcrypt-hashed passwords), roles, refresh token records, and account metadata. This is the most security-sensitive data store in the system; access is restricted to the Auth Service only.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-auth-db
title: Auth Database
technology: PostgreSQL 16
implements: concept-logging
:::
```

### Auth Database Connection

All credential and token operations go through this provider-owned database connection.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-auth-db
title: Auth Database Connection
provider: bb-auth-db
protocol: PostgreSQL wire protocol (TLS)
:::
```

## Response Cache

A Redis instance that fronts the Catalog Service for read-heavy endpoints: catalog search and book detail retrieval. Cache entries have a 60-second TTL as a safety net, but primary invalidation is event-driven — catalog writes trigger immediate eviction of affected keys.

The cache is a performance optimization, not a data store. If Redis is unavailable, the Catalog Service falls back to serving directly from PostgreSQL. Response times will degrade but the system remains functional.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::building-block
id: bb-cache
title: Response Cache
technology: Redis 7
implements: concept-logging, concept-cache-invalidation
:::
```

### Catalog Cache Contract

The Catalog Service checks this provider before querying the catalog database.

```arc42
:::ignore H014 This is only a demo for the arc42, code is out of scope:::

:::interface
id: if-catalog-cache
title: Catalog Cache Contract
provider: bb-cache
protocol: Redis protocol (RESP3)
:::
```
