# Building Blocks

Arc42 chapter 5: document the system's decomposition into building blocks and their interfaces.
Each building block is a deployable or logically cohesive unit. Interfaces connect pairs of
building blocks and make collaborations explicit and machine-verifiable.

One `##` section per building block or interface. Prose above the block explains purpose
and responsibilities; the DSL block records the machine-readable summary.

## API Gateway

The single entry point for all external traffic. Authenticates requests, applies rate limits,
and routes calls to downstream services. External clients never contact services directly.

The `technology` field is optional but recommended — it enables H003 to stay quiet and lets
the `arc42 get` output show the tech stack at a glance.
The `implements` field lists concept IDs from `08-concepts.arc42.md` that this block applies.
The `parent` field names a parent building block ID if this is a child/sub-block.

:::building-block
id: bb-api-gateway
title: API Gateway
technology: nginx / Kong
implements: concept-auth, concept-logging
:::

## User Service

Owns user identity, profile data, and authentication. Issues JWTs on successful login.
Other services validate tokens locally using the shared public key fetched at startup.

:::building-block
id: bb-user-service
title: User Service
technology: Java / Spring Boot
implements: concept-auth, concept-logging, concept-error-handling
:::

## API Gateway → User Service

The API Gateway forwards authentication requests to the User Service. This is the only path
through which external login requests reach the User Service.

The `between` field takes exactly two building block IDs separated by a comma.
The `protocol` field is optional but recommended for clarity.

:::interface
id: if-gateway-user
title: API Gateway → User Service
between: bb-api-gateway, bb-user-service
protocol: HTTP/REST
:::
