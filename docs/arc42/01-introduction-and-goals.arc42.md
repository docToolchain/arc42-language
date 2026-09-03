# Introduction and Goals

The arc42-language toolchain is a Markdown-based DSL and validation engine for software
architecture documentation following the arc42 template. It targets architects, maintainers,
and AI agents who need to write, read, and validate architecture documentation without
heavyweight tooling.

## 1.1 Requirements Overview

The toolchain must:

- Parse `.arc42.md` files and extract structured elements (building blocks, decisions,
  quality goals, scenarios, etc.)
- Validate cross-references, required fields, and arc42 structural conventions
- Render the workspace as a text/JSON overview via a CLI
- Work as a CI-friendly, scriptable command-line tool with stable JSON output and
  conventional exit codes
- Support AI agents as first-class authors of architecture documentation

## 1.2 Quality Goals

See [10-quality-requirements.arc42.md](10-quality-requirements.arc42.md) for the complete
quality catalog with priorities and measurable scenarios.

## 1.3 Stakeholders

| Role/Name   | Contact | Expectations                                                              |
| ----------- | ------- | ------------------------------------------------------------------------- |
| Architect   | —       | Communicating and evolving the system's design; clear block syntax        |
| Maintainer  | —       | Consistent, reliable toolchain; rules for structural and semantic quality |
| AI Agent    | —       | Understanding and updating architecture correctly; stable, simple DSL     |
| CI Pipeline | —       | Stable JSON output; exit code 1 on errors, 0 on clean                     |
