---
model: Calude Sonnet 5
harness: Claude web
agent: default
date: 2026/09/09
---

# @doctc/arc42: A Hands-On User Review

_Tested against a sample client-server architecture (web client, API, database), current
version v0.12.1._

## TL;DR

`@doctc/arc42` turns arc42 architecture docs into a validated model instead of free-form prose,
using typed `:::block` fences inside normal Markdown. It checks consistency against 62 rules,
links docs to real code paths, and — its standout feature — flags when code changes without the
matching docs being touched, which makes it usable as a CI gate against architecture drift. It
also ships an agent-guided workflow to reverse-engineer arc42 docs from an undocumented
codebase, with mandatory human review baked in. Worth adopting if you already do arc42 and
docs-as-code, especially if AI agents are touching your codebase; skip it if your docs already
live happily in a wiki or you're documenting something short-lived. It's still young — expect
rough edges and occasional breaking changes between releases.

## What it does

Instead of pure prose, you write Markdown with typed `:::blocktype ... :::` fences for
buildingblocks, interfaces, quality goals, decisions, risks, and so on. `arc42 explain <type>`
shows you the exact schema for any block type, so you're never guessing which fields are
required. `arc42 validate` then checks the whole model for gaps a plain-text doc would hide: a
quality goal with no decision behind it, a building block no interface ever connects to, an
interface with no protocol specified. These are exactly the questions that normally only surface
in a review meeting — the tool surfaces them while you're still writing.

One modeling choice stands out: interfaces aren't a symmetric "A talks to B" relationship.
Each `interface` has exactly one `provider` (the block that owns it), and every consumer —
another block or an external actor — explicitly declares `requires: <interface-id>`. That's
closer to how real API ownership works, and it makes "who actually depends on this?" a question
you can query instead of infer from prose.

## Where it really helps — architecture drift detection

This is the feature I'd lead with. `arc42 diff` compares your working tree against a git
reference (`HEAD`, `main`, `--staged`, any commit) and cross-references the code paths declared
via each building block's `path:` attribute. If a file under a documented path changed but the
corresponding `.arc42.md` chapter wasn't touched in the same diff, it surfaces that block as
needing review — a candidate drift, not an assumption that anything is actually wrong. With
`--strict`, this becomes a non-zero exit code, which makes it a genuine pre-commit or CI gate:
code and architecture docs are forced to move together, or the pipeline calls it out. That's the
core problem docs-as-code is supposed to solve, and this is the first time I've seen it enforced
this directly, against real git history rather than just the current file state.

A related, smaller feature: `:::ignore RULE reason:::` lets you suppress a specific rule for a
specific file with a documented reason — and if that suppression stops being needed, the tool
flags it as a stale ignore on its own. That keeps exceptions honest instead of accumulating dead
`// eslint-disable`-style comments nobody dares remove.

## Other things worth knowing

- **`arc42 guide`** walks an AI agent through reconstructing arc42 docs from an existing,
  undocumented codebase — with a separate evidence file, explicit `OPEN:` markers for uncertain
  facts, and a mandatory human-review gate before anything is validated. Thoughtfully
  guardrailed for a task that's easy to get wrong (hallucinated architecture facts).
- **`arc42 serve`** gives you a browsable web view — color-coded cards per element type,
  clickable cross-references, reference counts — much easier to review on screen than scrolling
  Markdown.
- **Gaps**: no diagram export (PNG/SVG) for slides or wikis; validation is purely diagnostic, no
  autofix; and the data model itself is still evolving — a recent change to the interface schema
  meant migrating every existing interface definition by hand. Community/ecosystem is
  essentially nonexistent so far, which is a real maintenance risk for teams betting long-term
  on it.

## Bottom line

If you already do arc42 seriously, or want AI coding agents to keep architecture docs honest
instead of letting them rot, this is genuinely useful — particularly the drift detection against
git history. Just don't wire it into a critical pipeline without watching the release notes; the
project is still moving fast enough that upgrades can require doc migrations.
