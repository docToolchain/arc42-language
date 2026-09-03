# Building Blocks

<!--
Arc42 chapter 5. Document the system's static decomposition into building blocks and their
interfaces. This view is mandatory for every architecture documentation — it is the floor plan
of your system.

A building block is any deployable or logically cohesive unit: a service, module, subsystem,
library, layer, or component. Start with the most important top-level blocks. Refine individual
blocks into sub-blocks (using the `parent` field) only when the internal structure is
architecturally significant.

An interface connects exactly two building blocks and makes their collaboration explicit.
Every significant communication path should have an interface.

For each building block or interface, write a ## section with a prose paragraph explaining
purpose, responsibility, and key constraints, followed by a DSL block.

Prefer relevance over completeness — document what is surprising, risky, or complex.
Leave out boring, standardised, or self-explanatory parts.

See https://docs.arc42.org/section-5/ for further guidance.

Example:

## API Gateway

The single entry point for all external traffic. Authenticates requests, applies rate limits,
and routes calls to downstream services. External clients never contact services directly.

```arc42
:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx / Kong
implements: concept-auth, concept-logging
:::
```

## User Service

Owns user identity and authentication. Issues tokens on successful login.

```arc42
:::building-block
id: bb-user-service
title: User Service
technology: Java / Spring Boot
implements: concept-auth, concept-logging
:::
```

## API Gateway → User Service

The API Gateway forwards authentication requests to the User Service.
This is the only path through which external login requests reach the User Service.

```arc42
:::interface
id: if-gateway-user
title: API Gateway → User Service
between: bb-api-gateway, bb-user-service
protocol: HTTP/REST
:::
```
-->
