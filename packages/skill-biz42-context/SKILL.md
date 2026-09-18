---
name: biz42-context
description: Use once a biz42 business model has been referenced for the product this arc42 workspace documents — a `.biz42.md` file, a biz42 workspace directory, `business-evidence.md`, or `biz42` CLI output appearing anywhere in the conversation. Guides how to read that organisation-level context, without inventing a field-level mapping between the two DSLs, while writing or revising arc42 chapter 1 (Introduction and Goals), chapter 10 (Quality Requirements), or chapter 11 (Risks and Technical Debt). Trigger this even if the user hasn't asked for the connection explicitly — a referenced biz42 document is itself the signal.
allowed-tools: Bash(arc42:*), Bash(biz42:*)
---

# arc42 ↔ biz42 context

biz42 is a notation convention for businesses, grounded in ISO 9001.
When a project is part of a biz42 modeled organization, this gives you substantial
context when shaping an architecture.

There is no reliable 1:1 mapping between arc42 and bis42 elements, two, so don't invent one.
Don't add `biz42:` fields to arc42 blocks. Don't ask the biz42 side to add `arc42:` fields either.
The connection lives in your understanding and in prose, not in either model.

_CAUTION: biz42 elements (capability, risk, expectation, signal, objective, …) are
organisation-scoped: they can describe the whole business, not just this one product.
This arc42 workspace is product-scoped._

## When to consult biz42

Before writing or revising:

- chapter 1 — Introduction and Goals
- chapter 10 — Quality Requirements
- chapter 11 — Risks and Technical Debt

Skip this for every other chapter. Building blocks, interfaces, deployment, concepts,
decisions, and the glossary don't need business-model input — they're about how the
system is built, not why it exists.

## Step 0 — orient product in business

It's crucial to understand the scope of the product you are architecting and how it plays
a role in contributing to the organizational objectives. =>
If you find a biz42 structure, directly read the products and services document.
Else, ask the user or propose to do a biz42 modelling in advance.

## Step 1 — full read (new workspace)

```bash
biz42 get <product-id>
```

Read `fulfills` (expectations) and `owner`. Only if that isn't enough: check which
capabilities list this product under `enables`, and read those too. Stop there — don't
walk further up the org graph into signals or objectives. That context is
organisational, not architectural, and pulling all of it in doesn't make the
architecture doc more correct.

## Step 1' — targeted read (existing workspace, single element)

Pull only what's relevant to the one element you're touching:

- New or changed quality-goal → check `product.fulfills` for a matching expectation.
  State in the goal's own prose whether one exists.
- New or changed risk (chapter 11) → no read needed going in; see the reverse case
  below.
- New or changed decision → the quality-goal it addresses already carries whatever
  business grounding it needed; there's usually nothing new to pull.

Most single-element edits touch none of this. That's the common case, not a gap.

## Step 2 — let it inform, don't transcribe

An expectation becomes input to a quality-goal, reworded at architecture altitude —
not copied verbatim. A product may also not fulfil all expectations, but contribute
only to a couple of them.
A capability becomes context for which building-blocks matter —
not a building-block itself. Most of what you read will produce nothing in the arc42
doc, and that's expected, not a shortfall.

## Step 3 — the reverse case

Writing or revising chapter 11 and you find a risk the organisation should know about
(for example, a decision that forecloses future options)? Say so in the risk's prose,
and flag it to the human as a candidate biz42 signal. Don't edit the biz42 repository
yourself — that repository, and the judgement call it represents, belongs to whoever
owns the business model.

## A known gap: no drift detection

biz42 can change after this arc42 doc was written from it — a new expectation, a
changed capability — and nothing tells you that happened. There is no shared field or
webhook between the two tools. Treat this as a periodic-review concern (for example,
when `arc42 diff` shows chapters 1, 10, or 11 haven't moved in a while), not something
this skill keeps in sync automatically.

## Commands

```bash
biz42 get --type product
biz42 get <product-id>
biz42 get <capability-id>
biz42 guide chapter 10
arc42 diff
```

## Done when

- Full authoring: chapter 1's prose names the biz42 product and the expectations you
  consulted.
- Single-element edit: that element's own prose states its grounding, or explicitly
  notes it has none.

Nothing here is validated by either CLI — `arc42 validate` doesn't know biz42 exists,
and it shouldn't.
