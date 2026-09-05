# Solution Strategy

The architecture balances the competing demands of performance, security, and maintainability for a small team operating a customer-facing e-commerce platform. The strategy can be summarized in three pillars: a service-oriented decomposition along business capabilities, a defense-in-depth security model, and an operational approach built on structured observability.

```arc42
:::solution-strategy
id: strategy-bookstore
title: Service-oriented decomposition with caching, stateless auth, and structured observability
addresses: qg-performance, qg-security, qg-availability, qg-maintainability, qg-observability
:::
```

## Service decomposition along business capabilities

The system is split into five services, each owning a single business capability and its data: Catalog, Order, Auth, Notification, and an API Gateway as the single entry point. This decomposition keeps each service small enough for one or two engineers to own, supports independent deployment, and isolates failures — a crash in the Notification Service does not affect checkout.

The number of services is deliberately kept low. With six engineers, operating more than five services would create unsustainable operational overhead. Each service owns its database schema; there are no shared databases.

## Caching for read-heavy catalog traffic

Catalog data changes infrequently but is read thousands of times per minute. A Redis cache layer sits between the Catalog Service and its database, absorbing the read load and keeping p95 response times within the 200ms target. Cache invalidation is event-driven: catalog writes publish an invalidation signal that evicts stale entries within seconds.

## Stateless authentication at the edge

JWT tokens are validated at the API Gateway without calling the Auth Service on every request. The Auth Service publishes its public key at startup; the gateway and downstream services validate tokens locally. This eliminates a network hop on the critical path and removes the Auth Service as a single point of failure for read traffic.

## Asynchronous notification delivery

Order events are published to a message queue. The Notification Service consumes these events and delivers email and SMS messages asynchronously. This decouples the checkout flow from delivery infrastructure — if the email service is slow or temporarily unavailable, orders are not affected.

## Structured observability from day one

All services emit structured JSON logs with a shared trace identifier propagated via HTTP headers. This enables cross-service request tracing without the operational burden of a full distributed tracing infrastructure. Centralized log aggregation and alerting are built into the deployment from the start.
