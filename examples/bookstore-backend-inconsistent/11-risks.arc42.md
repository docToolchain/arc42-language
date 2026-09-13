# Risks and Technical Debt

Known architectural risks and areas of technical debt, ordered by severity. Each entry includes a mitigation plan or an explicit decision to accept the risk.

## No Automated Performance Regression Tests

The performance quality goal (p95 search latency below 200ms) has no automated gate in the CI/CD pipeline. Performance regressions can be introduced and deployed without detection until a production incident or customer complaint occurs. The Redis caching layer masks many regressions, but a slow database query or a missing cache key could slip through unnoticed.

```arc42
:::risk
id: risk-no-perf-tests
title: No Automated Performance Regression Tests
severity: high
mitigation: Add a k6 load test suite as a nightly CI job with a p95 threshold gate. Block promotion to production if the threshold is exceeded. Target: end of Q2 2026.
:::
```

## Single-Region Deployment

All production infrastructure runs in a single AWS region (eu-central-1). A regional outage — rare but not unprecedented — would cause complete system unavailability. Multi-region deployment is not justified at current scale and budget, but the risk should be acknowledged and monitored.

```arc42
:::risk
id: risk-single-region
title: Single-Region Deployment
severity: high
mitigation: Accepted for now. RDS Multi-AZ provides availability zone redundancy. If uptime requirements increase beyond 99.9%, evaluate multi-region active-passive failover with Route 53 health checks.
:::
```

## JWT Tokens Cannot Be Revoked Before Expiry

Stateless JWT tokens are validated locally without checking a revocation list. If a token is compromised, it remains valid until it expires (15 minutes). For most threat scenarios the short expiry is sufficient, but a determined attacker could cause damage within that window.

```arc42
:::risk
id: risk-jwt-revocation
title: JWT Tokens Cannot Be Revoked Before Expiry
severity: medium
mitigation: Short token expiry (15 minutes) and single-use refresh tokens limit the window. If immediate revocation becomes required (compliance, incident response), add a Redis-backed token blocklist checked at the gateway. The validation contract does not need to change.
:::
```

## Stripe as Single Payment Processor

The system is tightly coupled to Stripe's API for payment processing. If Stripe experiences an outage or changes its API in a breaking way, checkout is completely blocked. There is no fallback payment processor.

```arc42
:::risk
id: risk-stripe-dependency
title: Single Payment Processor Dependency
severity: medium
mitigation: Introduce a payment abstraction layer in the Order Service that encapsulates Stripe-specific logic. This does not eliminate the runtime dependency but makes it feasible to add a second processor (e.g., Adyen) without restructuring the order flow. Target: before third-party integrations in phase two.
:::
```

## No Full-Text Search Engine

Catalog search relies on PostgreSQL's built-in full-text search with GIN indices. This works well for the current catalog size (under 500,000 titles) but may not scale to significantly larger catalogs or more sophisticated search requirements (fuzzy matching, faceted search, relevance tuning).

```arc42
:::risk
id: risk-no-search-engine
title: PostgreSQL Full-Text Search May Not Scale
severity: low
mitigation: Monitor search query latency and result quality as the catalog grows. If PostgreSQL search becomes a bottleneck or the product team requires advanced search features, evaluate Elasticsearch or OpenSearch as a read-side search index fed by catalog change events.
:::
```
