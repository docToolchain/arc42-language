# Runtime View

This chapter documents the architecturally significant runtime flows. Each scenario describes responsibilities and interactions between building blocks rather than implementation-level call stacks.

## Catalog Search

A customer searches for a book by keyword. The request flows through the gateway to the Catalog Service, which checks the cache before falling back to the database. This is the highest-traffic flow in the system and the primary target for the 200ms p95 latency goal.

1. The customer's client sends a search request to the API Gateway.
2. The gateway validates the request format and forwards it to the Catalog Service. Search is a public endpoint — no JWT validation is required.
3. The Catalog Service checks the Response Cache for a cached result matching the search query.
4. On a cache hit, the cached result is returned immediately. On a cache miss, the service queries the Catalog Database using full-text search.
5. The database result is written back to the cache with a 60-second TTL before being returned to the customer.

```arc42
:::runtime-scenario
id: rs-catalog-search
title: Catalog Search
trigger: Customer submits a search query
involves: bb-api-gateway, bb-catalog-service, bb-cache, bb-catalog-db
:::
```

```arc42
:::diagram
id: diag-catalog-search
scenario: rs-catalog-search
notation: mermaid-sequence
aliases: gw=bb-api-gateway, cat=bb-catalog-service, cache=bb-cache, db=bb-catalog-db
:::
```

```mermaid
sequenceDiagram
    actor Customer
    participant gw as API Gateway
    participant cat as Catalog Service
    participant cache as Response Cache
    participant db as Catalog Database

    Customer->>gw: GET /search?q=...
    gw->>cat: forward request
    cat->>cache: GET search:q:...
    alt cache hit
        cache-->>cat: cached result
    else cache miss
        cat->>db: SELECT with full-text search
        db-->>cat: results
        cat->>cache: SET search:q:... TTL 60s
    end
    cat-->>gw: search results
    gw-->>Customer: 200 OK
```

## Customer Login

A customer authenticates with username and password to obtain a JWT access token. This flow establishes the session for all subsequent authenticated operations.

1. The customer's client sends login credentials to the API Gateway.
2. The gateway forwards the request to the Auth Service without JWT validation (login is an unauthenticated endpoint).
3. The Auth Service verifies the credentials against the Auth Database. Passwords are compared using bcrypt.
4. On successful verification, the Auth Service generates a signed JWT access token (15-minute expiry) and a refresh token. Both are returned to the client.
5. On failure, the Auth Service returns a 401 response with an RFC 7807 error body. Failed attempts are logged with the client IP for security monitoring.

```arc42
:::runtime-scenario
id: rs-login
title: Customer Login
trigger: Customer submits login credentials
involves: bb-api-gateway, bb-auth-service, bb-auth-db
:::

:::diagram
id: diag-login
scenario: rs-login
notation: mermaid-sequence
aliases: gw=bb-api-gateway, auth=bb-auth-service, db=bb-auth-db
:::
```

```mermaid
sequenceDiagram
    actor Customer
    participant gw as API Gateway
    participant auth as Auth Service
    participant db as Auth Database

    Customer->>gw: POST /auth/login with credentials
    gw->>auth: forward request
    auth->>db: SELECT user WHERE email=...
    db-->>auth: user record + hashed password
    alt credentials valid
        auth->>auth: generate JWT (15min), refresh token
        auth-->>gw: 200 OK with tokens
    else credentials invalid
        auth-->>gw: 401 Unauthorized
    end
    gw-->>Customer: response with tokens or error
```

## Order Placement (Checkout)

A customer checks out their shopping cart. This is the most complex flow in the system — it involves stock verification, payment authorization, order persistence, and asynchronous notification. The flow is designed so that payment is authorized before the order is committed, and notification happens after the fact.

1. The customer's client sends a checkout request to the API Gateway with a valid JWT.
2. The gateway validates the JWT and forwards the request to the Order Service.
3. The Order Service retrieves the customer's cart from the Order Database.
4. The Order Service calls the Catalog Service to verify current prices and stock availability for all items in the cart.
5. If any item is out of stock or the price has changed, the Order Service returns an error to the customer with details of what changed.
6. The Order Service sends a payment authorization request to the external Payment Processor (Stripe) for the order total.
7. On successful payment authorization, the Order Service creates the order record in the Order Database with a snapshot of product data and the payment reference.
8. The Order Service publishes an OrderPlaced event to the Message Queue.
9. The Notification Service consumes the OrderPlaced event and sends an order confirmation email via the Email Delivery Service.
10. The customer receives an order confirmation response from the API Gateway.

```arc42
:::runtime-scenario
id: rs-checkout
title: Order Placement
trigger: Customer submits checkout request with items in cart
involves: bb-api-gateway, bb-order-service, bb-order-db, bb-catalog-service, bb-message-queue, bb-notification-service
:::

:::diagram
id: diag-checkout
scenario: rs-checkout
notation: mermaid-sequence
aliases: gw=bb-api-gateway, order=bb-order-service, orderDb=bb-order-db, catalog=bb-catalog-service, mq=bb-message-queue, notify=bb-notification-service
:::
```

```mermaid
sequenceDiagram
    actor Customer
    participant gw as API Gateway
    participant order as Order Service
    participant orderDb as Order Database
    participant catalog as Catalog Service
    actor payment as Payment Processor (Stripe)
    participant mq as Message Queue
    participant notify as Notification Service
    actor email as Email Delivery Service

    Customer->>gw: POST /checkout with JWT + cart
    gw->>order: forward request
    order->>orderDb: SELECT cart WHERE customer_id=...
    orderDb-->>order: cart items

    loop for each item
        order->>catalog: GET /products/:id
        catalog-->>order: product info + price + stock
    end

    alt all items available
        order->>payment: POST /v1/payment/authorize
        payment-->>order: payment_ok + reference
        order->>orderDb: INSERT order with snapshot data
        order->>mq: PUBLISH OrderPlaced event
        notify->>mq: CONSUME OrderPlaced
        notify->>email: send confirmation email
        email-->>notify: delivered
        order-->>gw: 201 Created order
        gw-->>Customer: order confirmation
    else stock/price issue
        order-->>gw: 400 Bad Request with details
        gw-->>Customer: error response
    end
```

## Catalog Update with Cache Invalidation

An administrator updates a book's price or stock level. This flow demonstrates the cache invalidation strategy that keeps the Response Cache consistent with the database.

1. The administrator sends an update request to the API Gateway with a valid JWT carrying an admin role.
2. The gateway validates the JWT and confirms the admin role before forwarding to the Catalog Service.
3. The Catalog Service writes the updated data to the Catalog Database within a transaction.
4. After the transaction commits, the Catalog Service invalidates the affected keys in the Response Cache. This covers both the individual book detail entry and any search result pages that might contain the updated book.
5. Subsequent search or detail requests for the affected book will miss the cache and fetch fresh data from the database.

```arc42
:::runtime-scenario
id: rs-catalog-update
title: Catalog Update with Cache Invalidation
trigger: Administrator updates a book record
involves: bb-api-gateway, bb-catalog-service, bb-catalog-db, bb-cache
:::

:::diagram
id: diag-catalog-update
scenario: rs-catalog-update
notation: mermaid-sequence
aliases: gw=bb-api-gateway, cat=bb-catalog-service, db=bb-catalog-db, cache=bb-cache
:::
```

```mermaid
sequenceDiagram
    actor Admin
    participant gw as API Gateway
    participant cat as Catalog Service
    participant db as Catalog Database
    participant cache as Response Cache

    Admin->>gw: PUT /admin/products/:id with JWT (admin role)
    gw->>cat: forward request
    cat->>db: BEGIN transaction
    cat->>db: UPDATE products SET ... WHERE id=...
    db-->>cat: updated record
    cat->>db: COMMIT
    db-->>cat: commit OK

    cat->>cache: DEL product:detail:...
    cat->>cache: DEL search:q:* (invalidate related search results)

    cat-->>gw: 200 OK updated product
    gw-->>Admin: success response
```

## Payment Webhook Processing

Stripe sends an asynchronous webhook notification when a payment status changes (captured, failed, refunded). This flow runs outside the customer's request path.

1. Stripe sends an HTTPS POST to a dedicated webhook endpoint on the API Gateway.
2. The gateway forwards the webhook to the Order Service without JWT validation (webhook authentication uses Stripe signature verification instead).
3. The Order Service verifies the Stripe webhook signature to confirm authenticity.
4. The Order Service updates the order status in the Order Database based on the payment event (e.g., marking the order as paid, failed, or refunded).
5. The Order Service publishes a corresponding domain event (OrderPaid, OrderFailed, OrderRefunded) to the Message Queue.
6. The Notification Service consumes the event and sends the appropriate notification to the customer — a payment confirmation, a failure notice requesting retry, or a refund confirmation.

```arc42
:::runtime-scenario
id: rs-payment-webhook
title: Payment Webhook Processing
trigger: Stripe sends a payment status webhook
involves: bb-api-gateway, bb-order-service, bb-order-db, bb-message-queue, bb-notification-service
:::

:::diagram
id: diag-payment-webhook
scenario: rs-payment-webhook
notation: mermaid-sequence
aliases: gw=bb-api-gateway, order=bb-order-service, orderDb=bb-order-db, mq=bb-message-queue, notify=bb-notification-service
:::
```

```mermaid
sequenceDiagram
    actor stripe as Stripe
    participant gw as API Gateway
    participant order as Order Service
    participant orderDb as Order Database
    participant mq as Message Queue
    participant notify as Notification Service

    stripe->>gw: POST /webhooks/stripe with signature
    gw->>order: forward webhook
    order->>order: verify Stripe signature
    alt signature valid
        order->>orderDb: UPDATE orders SET status=... WHERE stripe_reference=...
        orderDb-->>order: update OK
        alt payment captured
            order->>mq: PUBLISH OrderPaid event
        else payment failed
            order->>mq: PUBLISH OrderFailed event
        else payment refunded
            order->>mq: PUBLISH OrderRefunded event
        end
        notify->>mq: CONSUME domain event
        notify->>notify: render email template
        notify->>notify: send notification to customer
        order-->>gw: 200 OK
        gw-->>stripe: 200 OK
    else signature invalid
        order-->>gw: 401 Unauthorized
        gw-->>stripe: 401 Unauthorized
    end
```

## Token Refresh

A client's access token is about to expire and it requests a new one using the refresh token. This flow avoids forcing the customer to re-enter credentials every 15 minutes.

1. The client sends a token refresh request to the API Gateway with the refresh token.
2. The gateway forwards the request to the Auth Service.
3. The Auth Service validates the refresh token against the Auth Database — checking that it exists, has not been revoked, and has not expired.
4. On successful validation, the Auth Service issues a new access token and a new refresh token, invalidating the old refresh token to prevent reuse.
5. The new tokens are returned to the client.

```arc42
:::runtime-scenario
id: rs-token-refresh
title: Token Refresh
trigger: Client access token approaches expiry
involves: bb-api-gateway, bb-auth-service, bb-auth-db
:::

:::diagram
id: diag-token-refresh
scenario: rs-token-refresh
notation: mermaid-sequence
aliases: gw=bb-api-gateway, auth=bb-auth-service, db=bb-auth-db
:::
```

```mermaid
sequenceDiagram
    actor Client
    participant gw as API Gateway
    participant auth as Auth Service
    participant db as Auth Database

    Client->>gw: POST /auth/refresh with refresh token
    gw->>auth: forward request
    auth->>db: SELECT refresh_token WHERE token=... AND revoked=false
    db-->>auth: token record + user_id + expiry

    alt token valid and not expired
        auth->>auth: generate new access token (15min)
        auth->>auth: generate new refresh token
        auth->>db: UPDATE refresh_token SET revoked=true WHERE id=... (invalidate old)
        auth->>db: INSERT new refresh token
        auth-->>gw: 200 OK with new tokens
        gw-->>Client: response with new tokens
    else token invalid/expired/revoked
        auth-->>gw: 401 Unauthorized
        gw-->>Client: error response
    end
```
