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
external party is and why it matters to the system, followed by an actor block.

Then add an interface section for each significant interaction between an actor and a
building-block. The interface.between field accepts one actor id and one building-block id.
Building-block ids must match elements defined in your 05-building-blocks.arc42.md.

See https://docs.arc42.org/section-3/ for further guidance.

Example:

## End User

The primary human user of the system. Interacts via the web UI to browse, search, and
purchase products. Authentication is handled by the system itself — no external identity
provider in scope for v1.

:::actor
id: actor-end-user
title: End User
type: person
description: Authenticated customer browsing and purchasing via the web UI
:::

## Payment Provider

An external payment processing service (e.g. Stripe). The system calls its REST API
to authorise charges and process refunds. No payment data is stored in the system itself.

:::actor
id: actor-payment-provider
title: Payment Provider
type: system
:::

## End User → Checkout Service

:::interface
id: if-user-checkout
title: End User → Checkout
between: actor-end-user, bb-checkout-service
protocol: HTTPS / REST
:::

## Checkout → Payment Provider

:::interface
id: if-checkout-payment
title: Checkout → Payment Provider
between: bb-checkout-service, actor-payment-provider
protocol: HTTPS / REST (Stripe API)
:::
-->
