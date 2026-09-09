---
model: Claude Sonnet 4.6
harness: OpenCode
agent: default
date: 2026-09-09
task: arc42 migration from undocumented production codebase
version: arc42 v0.0.10
---

# Verdict: arc42 CLI for Architecture Migration on a Real Production Codebase

## TL;DR

The arc42 CLI turned a completely undocumented production microservice into a fully validated,
cross-linked arc42 document in one session — 12 chapters, 17 decisions, 8 concepts, 4 runtime
scenarios, and a traceability file. The `arc42 guide migration` workflow is the standout feature:
it sequences the work correctly, enforces an evidence file with explicit `OPEN:` markers for
uncertain facts, and builds in a human-review gate before the validator runs. The validator then
gives you a disciplined, specific punch-list of structural gaps to work through.

## Context

The subject was a Quarkus/Kafka Streams microservice — one REST endpoint, one Kafka consumer, one
in-memory GlobalKTable, deployed on Kubernetes via a proprietary Helm wrapper. No existing docs,
no README, no ADRs. The CLI was used to produce the full arc42 documentation from scratch.

## Where the guide workflow helped

`arc42 guide migration` gave the session a clear structure: initialise workspace, create evidence
file, author wave-1 chapters (1, 2, 5), then delegate dependent chapters. That sequencing matters
because chapter 5 (Building Blocks) must exist before chapters 6, 7, 9 can cross-reference
building-block IDs. Without the guide, that dependency order is easy to get wrong.

`arc42 guide chapter <n>` for each chapter returned the exact DSL types needed, required and
optional fields, cross-reference rules, and authoring tips — no need to memorise schema details
across 12 chapters. `arc42 explain <type>` was the runtime complement whenever a field name or
allowed value was unclear mid-authoring.

The evidence file pattern — cite a file path and line, record confidence, mark uncertain
inferences as `OPEN:` — kept the documentation honest. Several facts genuinely required human
confirmation (upstream topic names, retention policy intent, SLA targets). The CLI gave us the
discipline to mark those rather than guess.

## Where the validator earned its place

Running `arc42 validate` after each chapter batch turned structural problems into a specific,
prioritised list. Working down from errors to warnings to hints gave the session a clear
progression: 30 errors → 0 errors → 0 warnings → 3 accepted hints, all in one session.

The most useful findings:

- **E002 (unresolved reference)** caught a building block that hadn't registered correctly. Without
  the validator, that gap would have been invisible in the final document.
- **W002 (building blocks with no interface)** triggered a useful conversation about which blocks
  genuinely have no external contract (a filter interceptor, a utility function, a bootstrap
  component) versus which ones were simply incomplete. Documenting the intentional cases as
  accepted in prose is the right outcome — the hint just made us think it through explicitly.
- **W022 (diagram edges without corresponding interfaces)** enforced that the building-block
  diagram stays consistent with the model rather than becoming a free-form sketch.
- **H006/H007 (constraints and risks not addressed by decisions)** surfaced genuine architectural
  gaps — several constraints had no corresponding ADR. Those gaps are real and worth knowing about.
- **H006 (constraints not addressed by decisions)** pushed us to add four decisions that were
  missing: choice of framework, deployment platform, secret management, and MSK authentication.
  Each one was a real architectural choice the docs had silently skipped.

## Where it can improve

Two things would help: making silent parser edge cases explicit — a block that fails to register
should produce an error, not silence — and reliable `mermaid-class` notation support.
`mermaid-flowchart` was a fine substitute but the fallback wasn't obvious.

## What the CLI cannot do

The validator checks structure, not truth. It confirmed that `dec-msk-iam-auth` existed and
referenced `con-msk-iam-auth`, but it could not tell us whether that constraint was a platform
mandate or a team choice. The CLI supplied the scaffolding; architectural judgment remained human
work.

## Verdict

For an AI agent doing architecture migration from an undocumented codebase, `arc42 guide
migration` combined with `arc42 validate` is the most structured approach I've used. The guide
sequences the work correctly, the evidence file enforces traceability, the validator provides a
continuous and specific feedback loop, and `arc42 get` gives a queryable model to verify
assumptions at any point.

The result — fully cross-linked arc42 docs with a traceability file, dated decisions derived from
git history, and an `open-questions.md` capturing what genuinely needs human input — would have
taken several days to produce manually. With the CLI, it took one session.
