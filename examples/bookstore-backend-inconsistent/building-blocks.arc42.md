# Building Blocks

## Services

The backend consists of several services.

:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx
:::

:::building-block
id: bb-catalog-service
title: Catalog Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::

:::building-block
id: bb-order-service
title: Order Service
technology: Node.js / Express
implements: concept-logging, concept-error-handling
:::

:::building-block
id: bb-auth-service
title: Auth Service
technology: Node.js / Express
implements: concept-logging, concept-auth
:::

## Data Stores

:::building-block
id: bb-catalog-db
title: Catalog Database
technology: PostgreSQL
implements: concept-logging
:::

:::building-block
id: bb-order-db
title: Order Database
technology: PostgreSQL
implements: concept-logging
:::

:::building-block
id: bb-cache
title: Response Cache
technology: Redis
implements: concept-logging
:::

## Interfaces

The services communicate via HTTP/JSON.

:::interface
id: if-gateway-catalog
title: Gateway → Catalog
between: bb-api-gateway, bb-catalog-service
protocol: HTTP/JSON
:::

:::interface
id: if-gateway-order
title: Gateway → Order
between: bb-api-gateway, bb-order-service
protocol: HTTP/JSON
:::

:::interface
id: if-gateway-auth
title: Gateway → Auth
between: bb-api-gateway, bb-auth-service
protocol: HTTP/JSON
:::

:::interface
id: if-catalog-db
title: Catalog → Database
between: bb-catalog-service, bb-catalog-db
protocol: PostgreSQL wire protocol
:::

:::interface
id: if-order-db
title: Order → Database
between: bb-order-service, bb-order-db
protocol: PostgreSQL wire protocol
:::

:::interface
id: if-catalog-cache
title: Catalog → Cache
between: bb-catalog-service, bb-cache
protocol: Redis protocol
:::
