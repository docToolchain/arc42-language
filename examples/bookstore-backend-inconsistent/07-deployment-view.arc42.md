# Deployment View

The bookstore backend is deployed on AWS in the eu-central-1 region (Frankfurt) to comply with the EU data residency constraint. The production environment uses ECS Fargate for container orchestration, managed RDS for PostgreSQL databases, and ElastiCache for Redis. A staging environment mirrors the production topology with smaller instance sizes for pre-release validation.

## Production Environment

The production environment serves live customer traffic. All components run in the eu-central-1 region within a private VPC. Only the API Gateway's load balancer is exposed to the public internet.

```arc42
:::deployment-node
id: dn-production
title: Production (eu-central-1)
type: environment
:::
```

```arc42
:::diagram
id: diag-deployment-prod
view: deployment
notation: mermaid-architecture
aliases: alb_gw=bb-api-gateway, catalog=bb-catalog-service, order=bb-order-service, auth=bb-auth-service, notify=bb-notification-service, rds_catalog=bb-catalog-db, rds_order=bb-order-db, rds_auth=bb-auth-db, redis_cache=bb-cache, sqs=bb-message-queue
:::
```

```mermaid
architecture-beta
    group dn-production(cloud)[Production — eu-central-1]
    group dn-prod-alb(internet)[Load Balancer] in dn-production
    group dn-prod-ecs(server)[ECS Fargate Cluster] in dn-production
    group dn-prod-catalog-db(database)[RDS Catalog] in dn-production
    group dn-prod-order-db(database)[RDS Order] in dn-production
    group dn-prod-auth-db(database)[RDS Auth] in dn-production
    group dn-prod-redis(disk)[ElastiCache Redis] in dn-production
    group dn-prod-sqs(server)[SQS Queue] in dn-production

    service alb_gw(internet)[API Gateway] in dn-prod-alb
    service catalog(server)[Catalog Service] in dn-prod-ecs
    service order(server)[Order Service] in dn-prod-ecs
    service auth(server)[Auth Service] in dn-prod-ecs
    service notify(server)[Notification Service] in dn-prod-ecs
    service rds_catalog(database)[Catalog DB] in dn-prod-catalog-db
    service rds_order(database)[Order DB] in dn-prod-order-db
    service rds_auth(database)[Auth DB] in dn-prod-auth-db
    service redis_cache(disk)[Redis] in dn-prod-redis
    service sqs(server)[SQS] in dn-prod-sqs

    alb_gw:R --> L:catalog
    alb_gw:R --> L:order
    alb_gw:R --> L:auth
    catalog:B --> T:rds_catalog
    catalog:B --> T:redis_cache
    order:B --> T:rds_order
    order:B --> T:sqs
    auth:B --> T:rds_auth
    sqs:B --> T:notify
```

## Production Load Balancer

An AWS Application Load Balancer terminates TLS and distributes incoming HTTPS traffic to the API Gateway containers. It handles SSL certificate management, health checks, and connection draining during deployments.

```arc42
:::deployment-node
id: dn-prod-alb
title: Application Load Balancer
type: server
parent: dn-production
hosts: bb-api-gateway
:::
```

## Application Cluster

An ECS Fargate cluster runs all application services as containerized tasks. Each service runs as a separate ECS service with independent scaling policies, health checks, and deployment configurations. Fargate eliminates the need to manage EC2 instances, reducing operational overhead for the small team.

```arc42
:::deployment-node
id: dn-prod-ecs
title: ECS Fargate Cluster
type: container
parent: dn-production
hosts: bb-catalog-service, bb-order-service, bb-auth-service, bb-notification-service
:::
```

## Catalog Database Instance

A managed RDS PostgreSQL instance dedicated to the Catalog Service. Multi-AZ deployment provides automatic failover. Automated daily backups are retained for 14 days. The instance runs in a private subnet with no public internet access.

```arc42
:::deployment-node
id: dn-prod-catalog-db
title: RDS PostgreSQL (Catalog)
type: server
parent: dn-production
hosts: bb-catalog-db
:::
```

## Order Database Instance

A managed RDS PostgreSQL instance dedicated to the Order Service. Same Multi-AZ and backup configuration as the Catalog Database. Sized for write-heavy workloads during peak shopping periods.

```arc42
:::deployment-node
id: dn-prod-order-db
title: RDS PostgreSQL (Order)
type: server
parent: dn-production
hosts: bb-order-db
:::
```

## Auth Database Instance

A managed RDS PostgreSQL instance dedicated to the Auth Service. Encryption at rest is enabled with a customer-managed KMS key. This is the most security-sensitive database — access is restricted to the Auth Service's security group only.

```arc42
:::deployment-node
id: dn-prod-auth-db
title: RDS PostgreSQL (Auth)
type: server
parent: dn-production
hosts: bb-auth-db
:::
```

## Redis Cache Node

An ElastiCache Redis cluster with a single primary node and one read replica. Used exclusively by the Catalog Service for response caching. Runs in the same private subnet as the application cluster for low-latency access.

```arc42
:::deployment-node
id: dn-prod-redis
title: ElastiCache Redis
type: server
parent: dn-production
hosts: bb-cache
:::
```

## Message Queue

An SQS queue in the same region. SQS is a fully managed service — there is no infrastructure node to manage. The queue is configured with a visibility timeout of 60 seconds and a dead-letter queue that captures messages after three failed processing attempts.

```arc42
:::deployment-node
id: dn-prod-sqs
title: SQS Queue
type: server
parent: dn-production
hosts: bb-message-queue
:::
```

## Staging Environment

The staging environment mirrors the production topology for pre-release validation. It uses smaller instance sizes to reduce cost. Feature branches and release candidates are deployed here for integration testing before promotion to production.

```arc42
:::deployment-node
id: dn-staging
title: Staging (eu-central-1)
type: environment
:::
```

## Staging Application Cluster

A smaller ECS Fargate cluster running all services with reduced task counts (one task per service instead of the production minimum of two).

```arc42
:::deployment-node
id: dn-staging-ecs
title: ECS Fargate Cluster (Staging)
type: container
parent: dn-staging
hosts: bb-api-gateway, bb-catalog-service, bb-order-service, bb-auth-service, bb-notification-service
:::
```

## Staging Database

A single smaller RDS instance running all three database schemas (catalog, order, auth) in separate schemas on the same instance. This reduces cost while maintaining schema isolation.

```arc42
:::deployment-node
id: dn-staging-db
title: RDS PostgreSQL (Staging — All Schemas)
type: server
parent: dn-staging
hosts: bb-catalog-db, bb-order-db, bb-auth-db
:::
```

## Staging Cache

A single ElastiCache Redis node for staging. No replication — acceptable for a non-production environment.

```arc42
:::deployment-node
id: dn-staging-cache
title: ElastiCache Redis (Staging)
type: server
parent: dn-staging
hosts: bb-cache
:::
```

## Staging Message Queue

A single SQS queue for staging. Same configuration as production (visibility timeout, dead-letter queue) but lower throughput expectations.

```arc42
:::deployment-node
id: dn-staging-sqs
title: SQS Queue (Staging)
type: server
parent: dn-staging
hosts: bb-message-queue
:::
```
