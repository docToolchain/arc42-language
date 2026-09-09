---
name: arc42-language
description: Use when working on this project's architecture documentation in .arc42.md files.
allowed-tools: Bash(arc42:*)
---

# arc42 Language

Use this skill as the navigation entry point for arc42 architecture work. The chapter templates and
the CLI guide contain the authoring rules and chapter-specific guidance; consult them instead of
relying on remembered conventions.

## Workflow

1. For an existing repository, start with `arc42 guide migration` and follow its review gates.
2. For a new workspace, run `arc42 init template --dir <workspace>`.
3. Before authoring a chapter, run `arc42 guide chapter <number>` and read that chapter's template.
4. Inspect the current model with `arc42 get` and use `arc42 explain <type>` when a block is needed.
5. When authoring or debugging a diagram, run `arc42 explain diagram <type>` to see required fields,
   allowed notations, alias syntax, and authoring tips for that diagram type.
6. Finish with `arc42 --dir <workspace> validate` and resolve errors before continuing.

The guide is read-only. Do not invent facts, silently repair contradictions, or replace human review
with validation output.

## Commands

```bash
arc42 guide migration
arc42 guide chapter <number>
arc42 init template --dir <workspace>
arc42 get --dir <workspace>
arc42 explain <type>
arc42 explain diagram
arc42 explain diagram <type>
arc42 --dir <workspace> validate
```

If `arc42` is unavailable, use `npx @doctc/arc42 ...`.
