---
model: Claude Opus 5
harness: Kiro
date: 2026-09-09
task: arc42 migration of a multi-server MCP stack with DSGVO constraints
version: arc42 v0.14.0
---

# Verdict: arc42 CLI for a Human-Led Migration of a Real MCP Stack

## TL;DR

The toolset improved the documentation quality where it matters most: not in form, but in content.
Filling in `implements:` per building block surfaced a real architectural gap — the Azure DevOps
server could not claim the DSGVO concept because the personal-data filter was simply absent. That
finding did not come from reading the code. It came from three lines sitting side by side, one
shorter than the others.

## Context

The subject was a three-server MCP stack with DSGVO constraints, Bearer/Basic-Auth inconsistencies
across integrations, and no prior architecture documentation. The migration was performed by a human
practitioner using the `arc42 guide migration` workflow and the CLI interactively, not by an
automated agent.

## Where the workflow paid off

`arc42 rules` before authoring was the highest-leverage single command. Knowing upfront that
quality goals must be sorted descending, that a context diagram admits only blocks with direct
actor consumption, and that an interface belongs to exactly one building block meant the model was
designed once rather than revised three times. That sequencing advantage is structural, not
incidental.

The mandatory evidence file — source path, line, confidence, `OPEN:` for every contradiction —
was the second decisive element. It turned three documentation inconsistencies (README ".NET 8",
package version 9.10.0 vs 10.9.0, Bearer example against a Basic-Auth endpoint) into explicit
entries rather than silent corrections. A prose document would have smoothed those over. The typed
format made them visible.

The explicit instruction not to run a repair loop against the validator deserves recognition as
a design decision, not just a rule. The ten remaining hints are accurate: `risk-dsgvo-luecke-devops`
has no addressing decision because there is none. Keeping the document honest rather than clean is
the harder discipline, and the CLI enforced it from the outside.

`arc42 explain <type>` prevented at least one silent error: the chapter 9 template describes
`addresses` as pointing to quality goals and constraints; `explain decision` adds risks. Without
that output, H007 findings would have looked unsolvable.

E011 — implementation paths must resolve in the repository — is the only mechanism in the entire
chain that binds the documentation to the actual codebase mechanically. Every other link can drift
unnoticed. That rule alone justifies the typed format over prose.

## What the validator contributed

The validator's output was a disciplined, prioritised punch-list. Working from errors down to hints
gave the session a clear progression. The most consequential finding was W001 (`implements:` without
a matching building block), which is what exposed the missing personal-data filter in the DevOps
server. That finding is an architectural fact, not a formatting note.

## Usage friction — and what has since been fixed

Two friction points have been resolved in the current version:

- The CLI flag order (`arc42 --dir <workspace> validate`, not `arc42 validate --dir`) is now
  documented correctly in the skill.
- The chapter 6 template no longer uses an underscore-based participant example that implied
  hyphens must be replaced.

Two points remain open and worth addressing in a future release:

- `arc42 explain diagram` returns "Unknown block type". Diagram syntax — permitted notations,
  valid `view:` values — is checked by at least five rules but not yet queryable. A practitioner
  currently has to grep the installed bundle.
- The `aliases:` field, which resolves Mermaid keyword collisions for `actor-`-prefixed IDs, is
  undocumented. Because the arc42 naming convention for actors uses that exact prefix, the collision
  is predictable. A note in the error message would close the gap.

H014 ("Interface has no implementation path") also deserves recalibration: for runtime-provided
interfaces with no repository artefact, the hint reads as a defect rather than an expected state.

## Schema boundary reached by honest modelling

One modelling constraint surfaced during the migration that is worth recording. The schema assigns
interfaces to building blocks; actors can only `require`. For outbound calls — the MCP servers
calling Jira — the natural ownership is inverted: the adapter owns the integration point, and Jira
appears as a requiring actor. This is defensible and arguably cleaner from an ownership standpoint,
but the context diagram arrow then runs counter to the call direction. A prose explanation is
required alongside the diagram. This is a schema boundary, not a tooling defect; it should be
visible to practitioners before they reach chapter 3.

## Effort and return

Roughly one third of the session was tooling familiarisation; two thirds were architecture work.
For a first document in a repository that ratio is unfavourable. For a second document in the same
repository — where rules, field names, and ID conventions are already internalised — it inverts.
The investment is front-loaded.

## What the CLI cannot do

`0 errors` means the model is internally consistent, not that it correctly describes the system.
The validator checks references, paths, and structure. It does not check facts. The architectural
content came from the repository; the toolset arranged it so that a gap became visible. That
distinction is the most important thing to understand about the method.
