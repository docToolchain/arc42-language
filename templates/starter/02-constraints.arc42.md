# Architecture Constraints

<!--
Arc42 chapter 2. Document every requirement that limits your freedom of design and
implementation decisions. Constraints must always be dealt with — though some may be
negotiable. Architects need to know exactly where they have freedom and where they must adhere.

Constraints come from three sources:
- technical       — technology standards, infrastructure mandates, platform restrictions
- organizational  — legal requirements, compliance rules, budget limits, governance policies
- convention      — agreed coding standards, naming rules, documentation or versioning guidelines

For each constraint, write a ## section with a prose paragraph explaining the constraint,
its origin, and its architectural impact, followed by a DSL block.

The `source` field names the origin — a legal document, client contract, governance policy,
or internal standard. Omit it if the origin is an internal assumption.

See https://docs.arc42.org/section-2/ for further guidance.

Example:

## Personal Data Must Remain in the EU

All personally identifiable information must be stored and processed within the EU.
This limits which cloud regions, caching layers, and third-party SaaS tools are usable.
Origin: GDPR Art. 44, confirmed by legal review 2025-03-01.

:::constraint
id: con-data-residency
title: Personal Data Must Remain in the EU
category: organizational
source: GDPR Art. 44 / Legal review 2025-03-01
:::
-->
