# Glossary

Domain and technical terms used in this architecture documentation. These definitions ensure all stakeholders share the same understanding.

## JWT

JSON Web Token — an open standard (RFC 7519) for securely transmitting claims between parties as a signed JSON object. In this system, JWTs carry the authenticated user's identity and roles. They are signed by the Auth Service and validated locally by all other services using the Auth Service's public key.

```arc42
:::glossary-term
id: term-jwt
title: JWT (JSON Web Token)
definition: A compact, URL-safe token format (RFC 7519) containing signed claims about a user's identity and roles. Issued by the Auth Service and validated locally by all other services.
:::
```

## Trace ID

A unique identifier assigned to each incoming request at the API Gateway and propagated through all downstream service calls via the `X-Trace-Id` HTTP header. Used to correlate log entries across services for a single customer request.

```arc42
:::glossary-term
id: term-trace-id
title: Trace ID
definition: A unique request-scoped identifier propagated via the X-Trace-Id HTTP header, used to correlate structured log entries across all services involved in handling a single request.
:::
```

## Cache Invalidation

The process of removing or marking stale entries in the Response Cache when the underlying data in the Catalog Database changes. In this system, invalidation is event-driven — catalog writes trigger immediate eviction of affected cache keys, with a 60-second TTL as a safety net.

```arc42
:::glossary-term
id: term-cache-invalidation
title: Cache Invalidation
definition: Event-driven removal of stale entries from the Response Cache, triggered by catalog writes. A 60-second TTL provides a safety net for edge cases.
:::
```

## Dead-Letter Queue

A secondary message queue that captures messages from the primary queue after a configured number of failed processing attempts. Used by the Notification Service to isolate persistently failing messages for manual investigation without blocking the processing of subsequent messages.

```arc42
:::glossary-term
id: term-dlq
title: Dead-Letter Queue (DLQ)
definition: A secondary SQS queue that captures messages that fail processing after three attempts, isolating them for manual investigation without blocking subsequent message processing.
:::
```

## Domain Event

A message representing a significant state change in a business entity. In this system, the Order Service publishes domain events (OrderPlaced, OrderShipped, OrderCancelled, OrderPaid, OrderRefunded) to the message queue. The Notification Service consumes these events to trigger transactional messages.

```arc42
:::glossary-term
id: term-domain-event
title: Domain Event
definition: A message representing a significant business state change (e.g., OrderPlaced, OrderShipped) published to the message queue by the originating service and consumed by downstream services.
:::
```

## RFC 7807

An IETF standard (Problem Details for HTTP APIs) that defines a consistent JSON format for reporting errors from HTTP APIs. All services in this system return errors in this format, including a machine-readable `type` URI, a `title`, the HTTP status, and the request's trace ID.

```arc42
:::glossary-term
id: term-rfc7807
title: RFC 7807 (Problem Details)
definition: An IETF standard defining a JSON format for HTTP API error responses, including a type URI, title, status code, and detail field. Used by all services for consistent, machine-readable error reporting.
:::
```

## Rolling Deployment

A deployment strategy where new container instances are started alongside existing ones, and traffic is gradually shifted once the new instances pass health checks. Old instances are drained and terminated. This ensures zero downtime during deployments.

```arc42
:::glossary-term
id: term-rolling-deployment
title: Rolling Deployment
definition: A deployment strategy that replaces container instances incrementally, shifting traffic to new instances after health checks pass, ensuring zero downtime.
:::
```
