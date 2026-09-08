# System Scope and Context

<!--
Arc42 chapter 3. Define the boundary of your system and name every external party that
interacts with it. "External" means anything outside your system boundary — people, roles,
organisations, or other software systems that send or receive data, trigger behaviour, or
depend on your system's results.

Two types of actors:
- person  — a human role: end user, administrator, operator, support team, auditor
- system  — an external software system or service: third-party API, legacy system,
            message broker, external database, partner service

For each actor, write a ## section with a prose paragraph explaining who or what the
external party is and why it matters to the system, followed by an actor block with a
`requires` field listing the interface IDs it depends on.

Then add a context diagram containing the actors and only those building blocks that provide an
interface directly required by an actor. Internal-only providers belong in chapter 5. Define each
interface under the building block that provides it; each interface has exactly one provider and may
be required by multiple actors.

See https://docs.arc42.org/section-3/ for further guidance.

Example:

## End User

The primary human user of the system. Interacts via the web UI to browse, search, and
purchase products. Authentication is handled by the system itself — no external identity
provider in scope for v1.

```arc42
:::actor
id: actor-end-user
title: End User
type: person
description: Authenticated customer browsing and purchasing via the web UI
requires: if-user-checkout
:::
```

## Payment Provider

An external payment processing service (e.g. Stripe). The system calls its REST API
to authorise charges and process refunds. No payment data is stored in the system itself.

```arc42
:::actor
id: actor-payment-provider
title: Payment Provider
type: system
requires: if-checkout-payment
:::
```

Interface blocks belong in chapter 5 beneath their provider building blocks. Keep this chapter's
actor blocks focused on the interfaces they require and use the context diagram for actor-facing
building blocks only.
-->
