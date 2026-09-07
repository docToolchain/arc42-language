# Development Plan: arc42-language (feat/guide-typed-arc42-migration branch)

*Generated on 2026-09-07 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Provide a workflow for a qualified agent to recover an architecture model from an existing
repository and migrate it to typed arc42 documentation. The agent starts from the chapter
templates, delegates chapter work to subagents, records evidence for every derived fact in a
separate document, and only runs the arc42 CLI validation after all chapters are complete.

Human oversight is required for gaps, assumptions, contradictions, and unresolved validation
findings. Automatic fixing is explicitly out of scope because it could silently change the
meaning of the architecture.
## Key Decisions
- Prefer `guide` over `recover`: *recover* usually means restoring something that was lost or
  deleted, while this feature constructs an architecture model from evidence and may migrate
  existing prose. `guide` accurately describes a command that returns instructions without
  pretending the tool can perform the architectural work.
- Make `arc42 guide` the primary agent-facing command, with focused subcommands such as
  `arc42 guide migration`, `arc42 guide chapter <number>`, and `arc42 guide evidence`. Keep
  `arc42 explain <block-type>` as the detailed block-schema command instead of duplicating it.
- Keep `arc42 init template` as the file-writing/scaffolding operation. A guide command should
  print the relevant starter chapter and instructions on demand, not silently create or modify
  documents.
- Recovery is orchestration, not automatic inference: the command/skill prints instructions and
  does not rewrite source or architecture files.
- The orchestrator may run `arc42 init template --dir <docs>` or initialize a temporary directory,
  then delegate one subagent per chapter (with explicit dependency ordering for cross-references).
- Every subagent must write its derivation proofs to one separate Markdown evidence document,
  including the source path and location/symbol or command output, the resulting fact, and its
  confidence or open question.
- `arc42 explain` is the authoritative field/block reference during authoring. Validation is a
  final phase after all chapter subagents have finished, not an automatic repair loop.
- Human review owns gaps and uncertainty. The workflow must surface them and request decisions;
  it must never invent values or auto-fix findings.
- Preserve the existing installed arc42 skill as the canonical authoring reference and extend it
  with this migration workflow instead of creating a second incompatible DSL guide.
- Keep the skill change intentionally small because migration is a one-time activity. Add one
  prominent migration callout immediately after the skill introduction and before the normal
  ongoing-authoring instructions; link to `arc42 guide migration` and avoid duplicating the
  chapter catalog there.
- Put detailed, on-demand chapter instructions in the CLI guide output rather than expanding
  `SKILL.md`. Agents can request `arc42 guide chapter <number>` when they work on a chapter,
  while the installed skill remains focused on long-term documentation maintenance.
- Each chapter guide must include more than a template: it provides the chapter's content to
  capture, dependencies, evidence expectations, relevant `arc42 explain <type>` commands, and
  a reminder that `arc42 explain` lists the complete block catalog. This preserves the earlier
  chapter-content guidance while keeping it on demand.
- Reviewer feedback confirmed the split is suitable and DRY: templates remain the source for
  chapter starter content, `explain` remains the source for block syntax, the skill only points
  to the one-time workflow, and the CLI owns on-demand orchestration briefs. The chapter catalog
  is also the single source for chapter names used by CLI rule output.
- Do not add a JSON format for `guide`: this command serves agents directly, and there is no
  structured consumer that benefits from a second representation. Markdown is more useful for
  an agent, while removing JSON avoids a parallel schema and duplicated maintenance. Existing
  `validate` and `explain` JSON output remains unchanged because those commands have machine-
  readable data consumers.
- Rework guide text as executable agent instructions: explicit coordinator/subagent roles,
  objective and completion criteria, prerequisites, named artifacts, bounded inspection scope,
  dependency waves, explicit STOP human-review gate, recovery from interruption, and return
  contracts for delegated chapters. Use a fixed `architecture-evidence.md` convention and an
  `OPEN:` marker for uncertainty; keep templates and `arc42 explain` authoritative for content
  and syntax rather than duplicating them.

## Notes
- Issue #35 (`feat: recover`) asks for recovery from docs or source, a dedicated skill, and a
  CLI that returns instructions for an agent.
- The repository already has `packages/skill/SKILL.md`, `arc42 init skill`, starter templates,
  `arc42 explain`, `arc42 rules`, `arc42 get`, and `arc42 validate`; these are the primitives
  the recovery workflow should compose.
- `arc42 init template --dir <path>` copies the bundled `*.arc42.md` files and skips existing
  files, so the workflow can safely target a docs directory or an isolated temporary workspace.
- The templates establish the intended chapter concerns and dependencies: goals/constraints feed
  decisions and strategy; building blocks feed interfaces, runtime, and deployment; concepts are
  linked from building blocks; risks and glossary terms capture remaining uncertainty and language.
- A chapter-by-chapter delegation plan must account for those dependencies rather than launching
  all chapter agents blindly in parallel. Discovery and chapters 1/2/5 should establish IDs before
  dependent chapters create cross-references; chapter 12 can proceed independently.
- The evidence artifact must be separate from `*.arc42.md` model files so it is not mistaken for
  a typed architecture chapter. A stable default name/location remains to be decided in Plan.
- Existing templates contain authoring guidance, but some examples need reconciliation with the
  current typed model before the migration workflow can call them authoritative: for example the
  starter risk example uses `probability`/`impact` while the current model uses `severity`, and
  the glossary comments mention an unsupported `abbreviation` field. This is an implementation
  risk to resolve or explicitly guard against.
- Existing CLI command dispatch and help are centralized in `packages/cli/src/cli.ts` and
  `packages/cli/src/help.ts`; bundled assets are copied by `packages/cli/vite.config.ts`.
- Existing CLI tests execute the TypeScript entry point directly and assert help text, making a
  command-level guidance test straightforward without filesystem fixtures.
- The migration callout should be short enough to scan once: initialize templates, create the
  evidence document, delegate chapters to qualified subagents, escalate gaps to a human, and
  validate only after completion. The command provides the detailed procedure.
- The existing typed block model has cross-reference and validation rules, so migration must
  build an inventory first and validate only in the final workflow phase rather than bulk-
  converting prose blindly or repairing it automatically.

### Naming and command alternatives considered
- `recover`: rejected as the public command name; it suggests restoring lost documentation and
  under-describes new documentation construction.
- `migrate`: useful as a mode when source docs already exist, but too narrow for repositories
  whose architecture must be derived from source code.
- `bootstrap`/`init`: useful for scaffolding files, but not for a read-only instruction provider;
  retain `init` for creating templates.
- `guide`: selected because it covers construction and migration and makes the non-automating
  nature explicit.

## Requirements
- A qualified coordinating agent can start from the bundled arc42 chapter templates, either in
  the target docs directory or in a temporary directory before migration.
- The workflow delegates chapter completion to subagents; each subagent produces prose and the
  appropriate typed DSL blocks, using `arc42 explain` when block details are needed.
- The workflow creates and maintains a separate evidence/proofs Markdown document that traces
  each documented fact and important relationship back to repository documentation or source.
- The workflow instructs the coordinator to wait until chapter work is complete before running
  `arc42 validate` and to present validation findings rather than auto-fixing them.
- The workflow explicitly routes missing information, contradictions, assumptions, and remaining
  errors to human oversight.
- The workflow supports existing documentation and source code as evidence and does not claim
  unsupported certainty when neither provides proof.

## Explore
### Tasks
- [x] Read issue #35 and identify the requested recovery capabilities
- [x] Inspect existing agent skill, CLI commands, templates, explain/rules/validate primitives
- [x] Identify the appropriate boundary: qualified-agent orchestration instead of automatic inference
- [x] Define template initialization, chapter delegation, evidence capture, final validation, and human oversight
- [x] Map chapter dependencies that affect subagent ordering and cross-reference creation
- [x] Identify template/model inconsistencies that must be resolved before implementation
- [x] Record the clarified scope and safety principles

### Completed
- [x] Created development plan file
- [x] Explored issue and existing implementation
- [x] Documented clarified requirements, dependencies, risks, and decisions

## Plan
### Tasks
- [x] Choose user-facing terminology and document why `guide` is preferable to `recover`
- [x] Define the CLI boundary: `init` writes files, `guide` prints instructions, `explain` describes blocks
- [x] Define guide subcommands for the complete migration workflow, chapter-specific work, and evidence
- [x] Define the chapter guide output contract: starter content, chapter purpose, evidence prompts,
  dependencies, and relevant `arc42 explain`/validation commands
- [x] Define the orchestration contract: discovery, dependency-aware subagents, human review, then final validation
- [x] Define implementation/test tasks for the Code phase

### Completed
- Naming recommendation and command model documented
- Scope and boundaries reconciled with the existing `init` and `explain` commands
- Implementation sequencing and test strategy prepared

### Implementation plan for Code phase
1. Add a reusable Markdown guide catalog containing the complete migration workflow, chapter
   briefs (1–12), evidence-record format, dependency order, and human-review gate.
2. Add only a short, prominent migration callout near the beginning of
   `packages/skill/SKILL.md`; link to the detailed CLI guide and keep the existing ongoing-use
   guidance unchanged apart from command references that must remain accurate.
3. Add `arc42 guide` dispatch and help text. Implement `guide migration`, `guide chapter <n>`,
   and `guide evidence`; chapter output includes the bundled starter template content and
   commands such as `arc42 explain <type>` without writing files.
4. Add clear text output for agent consumption with useful errors for unknown chapters/subcommands.
5. Add CLI tests for root/subcommand help, every chapter lookup, template inclusion, evidence
   instructions, and the guarantee that guide commands do not write files.
6. Reconcile or update starter-template examples that disagree with the current model before
   presenting them as authoritative (notably risk severity and glossary fields).
7. Build and test the CLI; validate the guide output against the checked-in templates and use
   the existing project validation commands as the final verification.

## Code
### Tasks
- [x] Add reusable migration/chapter/evidence guide output as actionable Markdown
- [x] Include chapter-specific content guidance, dependencies, starter template, and explain commands
- [x] Add `arc42 guide` dispatch, help text, validation, and read-only behavior
- [x] Add a small prominent one-time migration callout at the beginning of `SKILL.md`
- [x] Reconcile stale risk and glossary examples in starter templates
- [x] Add CLI coverage for help, all chapter guides, and template inclusion
- [x] Review command intuitiveness, suitability, and duplication; fix help discoverability,
  chapter-name duplication, workspace-discovery noise, and evidence-contract coverage
- [x] Rewrite migration, chapter, and evidence text for step-by-step agent operation, explicit
  checkpoints, delegation return contracts, human STOP gates, and partial-progress recovery
- [x] Run formatting, checks, package tests, and CLI build

### Completed
- Implemented `guide`, `guide migration`, `guide chapter <1-12>`, and `guide evidence`
- Reviewer found the command intuitive and the content split appropriate; addressed all P2/P3 findings
- Removed guide JSON after reviewing its value; the agent-facing Markdown output is the single guide format
- All CLI tests pass; package checks pass; CLI build completes successfully

## Commit
### Tasks
- [x] Inspect the complete diff and confirm only intended files are included
- [x] Verify formatting, checks, tests, and build before committing
- [x] Create a conventional commit describing the agent migration guidance

### Completed
- Diff reviewed; implementation, tests, skill guidance, template corrections, and plan are intended
- Verification completed: checks pass, 26 CLI tests pass, and the CLI build succeeds



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
