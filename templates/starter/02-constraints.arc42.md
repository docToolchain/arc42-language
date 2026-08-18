# Constraints

Arc42 chapter 2: document the constraints that limit architectural freedom.
Constraints come from three sources: the technology landscape (`technical`), the organisation
and its processes (`organizational`), and agreed conventions or standards (`convention`).
Each constraint gets its own section. Use the `addresses` field on a decision in chapter 9 to
show how an architectural choice responds to a constraint.

## Deployment Platform

The system must run on the organisation's existing Kubernetes cluster.
This rules out serverless or proprietary PaaS deployment models and influences
container design, health check conventions, and resource limits.

The `source` field names where the constraint originates — legal document, client contract,
governance policy, or internal standard. Leave it blank if the origin is an internal assumption.

:::constraint
id: con-kubernetes
title: Deployment Platform is Kubernetes
category: technical
source: Infrastructure Policy v2.1
:::

## Data Residency

All personally identifiable information must be stored and processed within the EU.
This limits which cloud regions, caching layers, and third-party SaaS tools are usable.

:::constraint
id: con-data-residency
title: Personal Data Must Remain in the EU
category: organizational
source: GDPR Art. 44 / Legal review 2025-03-01
:::

## API Versioning Convention

All public REST APIs must use URI versioning (`/v1/`, `/v2/`) and maintain the previous major
version for at least 6 months after a new one is published. This is an agreed team convention,
not an external requirement.

:::constraint
id: con-api-versioning
title: URI Versioning with 6-Month Deprecation Period
category: convention
:::
