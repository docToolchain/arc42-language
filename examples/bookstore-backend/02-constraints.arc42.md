# Architecture Constraints

These constraints are non-negotiable boundaries that shaped every architectural decision. They come from the organization, regulatory environment, and technology landscape.

## PostgreSQL as Primary Database

The operations team has deep PostgreSQL expertise built over several years. All monitoring, backup, failover, and performance tuning runbooks assume PostgreSQL. Switching to a different database engine would require retraining the entire ops team and rebuilding the operational toolchain.

```arc42
:::constraint
id: con-postgresql
title: PostgreSQL as Primary Database
category: technical
source: Operations team capability and existing toolchain
:::
```

## RESTful HTTP API

Web and mobile clients consume the backend through a RESTful HTTP API. The mobile team has invested in REST client infrastructure and does not support GraphQL or gRPC. Third-party integrations planned for phase two also assume REST.

```arc42
:::constraint
id: con-rest-api
title: RESTful HTTP API for All External Clients
category: technical
source: Mobile team capability and third-party integration requirements
:::
```

## JWT-Based Authentication

The organization has standardized on JWT for service-to-service and client-to-server authentication across all products. The shared identity platform issues JWTs and all backend systems must accept them. Session-based authentication is not permitted.

```arc42
:::constraint
id: con-jwt-auth
title: JWT-Based Authentication
category: organizational
source: Organization-wide identity platform standard
:::
```

## AWS as Cloud Platform

The company has an enterprise agreement with AWS. All production workloads must run on AWS infrastructure. The agreement covers compute, managed databases, container orchestration, and CDN services.

```arc42
:::constraint
id: con-aws
title: AWS as Cloud Platform
category: organizational
source: Enterprise agreement with AWS
:::
```

## Personal Data Remains in EU Region

All personally identifiable information — customer profiles, order history, payment references — must be stored and processed within the EU. This constrains the choice of AWS regions and rules out any SaaS tool that does not offer EU data residency.

```arc42
:::constraint
id: con-data-residency
title: Personal Data Must Remain in the EU
category: organizational
source: GDPR Art. 44 / Legal review 2025-11-15
:::
```

## Team Size and Structure

The development team consists of six engineers. The architecture must allow parallel work without excessive coordination overhead. A microservices approach with too many services would create more operational burden than a team this size can sustain.

```arc42
:::constraint
id: con-team-size
title: Small Development Team (6 Engineers)
category: organizational
source: Current staffing plan
:::
```
