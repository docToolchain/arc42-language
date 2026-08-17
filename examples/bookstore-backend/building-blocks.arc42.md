# Building Blocks

The bookstore backend follows a service-oriented decomposition. Each service owns its data and
exposes a well-defined HTTP/JSON interface. The API Gateway is the single entry point for all
external clients — it routes requests to the appropriate service but does not contain business logic.

## API Gateway

The gateway handles TLS termination, request routing, and rate limiting. It delegates all
authentication decisions to the Auth Service via a sub-request before forwarding to the target
service. No business logic lives here.

:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx
:::

## Catalog Service

The Catalog Service owns all product data: titles, authors, ISBNs, prices, and inventory counts.
It is the only service that writes to the catalog database. Search results are cached in Redis
to meet the 300ms p95 target defined in `qg-performance`.

:::building-block
id: bb-catalog-service
title: Catalog Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::

## Order Service

The Order Service handles the full order lifecycle: cart, checkout, payment confirmation, and
order history. It publishes domain events (OrderPlaced, OrderCancelled) for downstream consumers.
It has no dependency on the Catalog Service at runtime — product data is denormalised into orders
at checkout time.

:::building-block
id: bb-order-service
title: Order Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::

## Auth Service

The Auth Service issues JWT tokens on successful login and provides a public key endpoint for
local token validation by other services. It is the only service that touches the user credential
store. All token validation in other services is stateless — no runtime calls back to Auth.

:::building-block
id: bb-auth-service
title: Auth Service
technology: Node.js / Express
implements: concept-logging, concept-auth
:::

## Catalog Database

The Catalog Service owns a dedicated PostgreSQL schema containing the products, categories, and
inventory tables. No other service reads from this database directly — all access goes through
the Catalog Service API.

:::building-block
id: bb-catalog-db
title: Catalog Database
technology: PostgreSQL
implements: concept-logging
:::

## Order Database

The Order Service owns a dedicated PostgreSQL schema containing orders, line items, and payment
records. Denormalised product snapshots are stored at order creation time so the order history
is independent of catalog changes.

:::building-block
id: bb-order-db
title: Order Database
technology: PostgreSQL
implements: concept-logging
:::

## Response Cache

A Redis instance fronts the Catalog Service for read-heavy endpoints. The cache TTL is 60 seconds.
Writes to the catalog trigger an invalidation event so stale data is evicted promptly.

:::building-block
id: bb-cache
title: Response Cache
technology: Redis
implements: concept-logging
:::

## Gateway → Catalog Interface

The primary read/write path for product data. The gateway forwards all `/catalog/**` requests
to the Catalog Service after authentication validation.

:::interface
id: if-gateway-catalog
title: Gateway → Catalog
between: bb-api-gateway, bb-catalog-service
protocol: HTTP/JSON
:::

## Gateway → Order Interface

The order placement and history path. The gateway forwards all `/orders/**` requests to the
Order Service.

:::interface
id: if-gateway-order
title: Gateway → Order
between: bb-api-gateway, bb-order-service
protocol: HTTP/JSON
:::

## Gateway → Auth Interface

Used for token issuance (login) and public key retrieval. The gateway also calls Auth for
token validation on every authenticated request before forwarding downstream.

:::interface
id: if-gateway-auth
title: Gateway → Auth
between: bb-api-gateway, bb-auth-service
protocol: HTTP/JSON
:::

## Catalog Service → Catalog Database Interface

All catalog reads and writes go through this connection. Connection pooling is managed by
the Catalog Service; the database is not directly accessible from outside the service boundary.

:::interface
id: if-catalog-db
title: Catalog → Database
between: bb-catalog-service, bb-catalog-db
protocol: PostgreSQL wire protocol
:::

## Order Service → Order Database Interface

All order reads and writes go through this connection. The Order Service is the sole writer
to the order schema.

:::interface
id: if-order-db
title: Order → Database
between: bb-order-service, bb-order-db
protocol: PostgreSQL wire protocol
:::

## Catalog Service → Response Cache Interface

The Catalog Service checks Redis before hitting the database for search and product detail
requests. Cache misses fall through to the database and the result is written back to cache.

:::interface
id: if-catalog-cache
title: Catalog → Cache
between: bb-catalog-service, bb-cache
protocol: Redis protocol
:::
