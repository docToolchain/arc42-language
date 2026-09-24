---
name: commit
description: Use whenever creating a git commit in this repository. Defines the required commit message format.
---

# Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) for the subject:
`<type>(<optional scope>): <imperative summary>`, e.g. `feat(core): add workspace diff`.
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `build`.

The body always has these three sections:

```
## Intent

Why this change exists — the problem, not the diff.

## Key decisions

- Choices made and alternatives rejected, with the reason.

## Side effects

- Behaviour changes, renamed/removed APIs, test adjustments, follow-ups.
```

Write "None." under a section that has nothing to say — never drop it.
