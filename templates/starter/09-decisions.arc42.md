# Architecture Decisions

Arc42 chapter 9: document the significant architecture decisions as Architecture Decision Records (ADRs).
Each decision captures a choice, the status it is in, the date it was made, and the quality goals
or constraints it addresses. Decisions can also supersede earlier decisions when the team revisits
and changes course.

Status values: `proposed` (under discussion), `accepted` (in force), `deprecated` (no longer
recommended but not replaced), `superseded` (replaced by another decision — must set `supersedes`).

## Use Kubernetes for All Deployments

The team evaluated bare-metal, VM-based, and container-orchestrated deployments.
Kubernetes was selected because it matches the existing infrastructure investment and satisfies
the deployment platform constraint. It provides declarative rollout, self-healing, and
horizontal autoscaling without requiring a proprietary runtime.

The `addresses` field links this decision to the quality goals and constraints it responds to.
Use IDs from `01-quality-goals.arc42.md` and `02-constraints.arc42.md`.
The `date` field should be ISO 8601 (YYYY-MM-DD) — it enables the W003 staleness check.

:::decision
id: dec-kubernetes
title: Use Kubernetes for All Deployments
status: accepted
date: 2025-06-15
addresses: con-kubernetes, qg-performance
:::

## Stateless JWT Authentication

The team considered session-based authentication (server-side session store) and token-based
authentication (stateless JWT). Stateless JWT was selected to avoid a shared session store that
would become a single point of failure and a horizontal scaling bottleneck.

The `supersedes` field names the ID of the decision this one replaces. It is required when
`status` is `superseded` (rule E006), and optional otherwise.

:::decision
id: dec-auth-jwt
title: Stateless JWT Authentication
status: accepted
date: 2025-07-01
addresses: qg-security, qg-performance, con-data-residency
:::
