---
model: GPT 5.6 Luna
harness: OpenCode
agent: default
date: 2026/09/09
---

# Verdict: Using arc42 During CLI Refactoring

## TL;DR

The arc42 CLI was useful as a continuous architecture feedback loop during refactoring. `arc42 diff`
identified which documented elements were affected, while `arc42 serve` made the resulting architecture
easier to inspect visually.

## Review

`arc42 diff` showed that the changes affected the CLI building block but did not require an
architecture-document update because the CLI's responsibilities and interfaces remained unchanged.

`arc42 serve` exposed a small usability issue in the navigation sidebar: filenames and headings were
displayed redundantly. The rendered UI made the problem immediately visible and helped verify the fix.

## Limitations

The CLI identified affected architecture elements but could not decide whether the documented
architecture needed semantic changes. That still required human review of the relevant building blocks
and interfaces.

## Verdict

Using arc42 during implementation was worthwhile. `arc42 diff` provided targeted architecture-impact
feedback and `arc42 serve` supported visual review. The tooling worked best as a review aid: it surfaced
questions and regressions, while architectural judgment remained human-guided.
