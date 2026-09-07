import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Chapter = {
  number: number;
  title: string;
  file: string;
  focus: string;
  content: string;
  dependencies: string;
  commands: string[];
};

const CHAPTERS: readonly Chapter[] = [
  {
    number: 1,
    title: "Introduction and Goals",
    file: "01-introduction-and-goals.arc42.md",
    focus: "Establish the system purpose, stakeholders, and measurable quality goals.",
    content:
      "Document the requirements that drive architecture and the quality scenarios that make success measurable.",
    dependencies: "Start here; quality-goal IDs are used by chapters 4, 5, and 9.",
    commands: ["arc42 explain quality-goal", "arc42 explain quality-scenario"],
  },
  {
    number: 2,
    title: "Constraints",
    file: "02-constraints.arc42.md",
    focus: "Record constraints that restrict architecture decisions, with their source.",
    content:
      "Capture technical, organizational, and convention constraints; distinguish evidence from assumptions.",
    dependencies: "Do early; constraint IDs are used by strategy and decisions.",
    commands: ["arc42 explain constraint"],
  },
  {
    number: 3,
    title: "System Scope and Context",
    file: "03-system-context.arc42.md",
    focus: "Describe the system boundary, actors, and neighboring systems.",
    content:
      "Identify human and system actors, external systems, responsibilities, and the interfaces crossing the boundary.",
    dependencies: "Establishes actors for interfaces and runtime views.",
    commands: ["arc42 explain actor", "arc42 explain interface"],
  },
  {
    number: 4,
    title: "Solution Strategy",
    file: "04-solution-strategy.arc42.md",
    focus: "Summarize the fundamental approaches used to meet goals and constraints.",
    content:
      "Explain the few architecture-shaping strategies and link them to the quality goals they address.",
    dependencies: "Depends on goals and constraints.",
    commands: ["arc42 explain solution-strategy"],
  },
  {
    number: 5,
    title: "Building Blocks",
    file: "05-building-blocks.arc42.md",
    focus: "Identify the important logical building blocks and their responsibilities.",
    content:
      "Describe the system, containers, components, technologies, responsibilities, and relationships between the building blocks that are stable enough to reference.",
    dependencies: "Create stable building-block IDs before dependent chapters add references.",
    commands: ["arc42 explain building-block"],
  },
  {
    number: 6,
    title: "Runtime View",
    file: "06-runtime-view.arc42.md",
    focus: "Show important runtime scenarios, interactions, and interfaces.",
    content:
      "Trace representative use cases through actors, building blocks, and interfaces; document observable behavior rather than every call.",
    dependencies: "Depends on actors, building blocks, and interfaces.",
    commands: ["arc42 explain interface", "arc42 explain actor"],
  },
  {
    number: 7,
    title: "Deployment View",
    file: "07-deployment-view.arc42.md",
    focus: "Describe the technical deployment topology and hosted building blocks.",
    content:
      "Record environments, nodes, hosting relationships, and operational boundaries supported by repository evidence.",
    dependencies: "Depends on building-block IDs and deployment evidence.",
    commands: ["arc42 explain deployment-node"],
  },
  {
    number: 8,
    title: "Cross-cutting Concepts",
    file: "08-concepts.arc42.md",
    focus: "Capture concepts that shape multiple parts of the architecture.",
    content:
      "Describe shared rules and mechanisms such as security, error handling, persistence, communication, or observability.",
    dependencies: "Define concept IDs before linking building blocks with implements.",
    commands: ["arc42 explain concept"],
  },
  {
    number: 9,
    title: "Architecture Decisions",
    file: "09-decisions.arc42.md",
    focus: "Record significant decisions, their status, and what they address.",
    content:
      "Capture the decision, context, status, date when known, and the goals, constraints, or risks it addresses.",
    dependencies: "Depends on goals, constraints, risks, and strategy IDs.",
    commands: ["arc42 explain decision"],
  },
  {
    number: 10,
    title: "Quality Requirements",
    file: "10-quality-requirements.arc42.md",
    focus: "Detail quality scenarios and the measurable criteria for success.",
    content:
      "Elaborate important quality goals with stimulus, response, and measurable metrics; do not invent measurements without evidence.",
    dependencies: "Elaborates the quality goals from chapter 1.",
    commands: ["arc42 explain quality-scenario"],
  },
  {
    number: 11,
    title: "Risks and Technical Debt",
    file: "11-risks.arc42.md",
    focus: "Make technical risks and debt visible, including mitigation or acceptance.",
    content:
      "Describe each risk or debt item, its cause and consequence, severity, and mitigation or explicit acceptance.",
    dependencies: "Risks may be referenced by architecture decisions.",
    commands: ["arc42 explain risk"],
  },
  {
    number: 12,
    title: "Glossary",
    file: "12-glossary.arc42.md",
    focus: "Define domain and technical terms used consistently in the documentation.",
    content:
      "Define terms that carry architectural meaning, clarify synonyms, and keep the typed definition concise.",
    dependencies: "Independent; complete alongside the other chapters.",
    commands: ["arc42 explain glossary-term"],
  },
];

function templatePath(assetDir: string, file: string): string {
  const bundled = join(assetDir, "templates", file);
  if (existsSync(bundled)) return bundled;
  return join(assetDir, "../../../templates/starter", file);
}

function chapter(number: number): Chapter | undefined {
  return CHAPTERS.find((item) => item.number === number);
}

export function guideText(
  subcommand = "migration",
  argument?: string,
  assetDir = process.cwd(),
): string {
  if (subcommand === "migration") {
    return `# arc42 migration guide

## Your role
You are the migration coordinator. Produce a complete, typed arc42 architecture model from an
existing repository's documentation and source code. Delegate chapter authoring to qualified
subagents, maintain the evidence file, and own the review gates. Never invent architectural facts,
silently resolve contradictions, or automatically repair validation findings.

## Objective and completion criteria
Produce twelve \`*.arc42.md\` chapter files and \`architecture-evidence.md\` in the selected
workspace. The migration is complete only when:
- every chapter has been considered and its important facts have evidence or an explicit \`OPEN:\` item;
- a human has reviewed the evidence, assumptions, contradictions, and chapter summaries; and
- \`arc42 validate --dir <workspace>\` reports zero errors, with remaining warnings or hints presented
  to the human rather than silently fixed.

## Before you start
1. Verify the CLI with \`arc42 --version\`; if it is unavailable, use \`npx @doctc/arc42\`.
2. Choose \`<workspace>\`, the directory containing the chapter files, and use it consistently.
3. Identify the repository root containing the source and existing documentation.
4. Do not begin authoring until you have read this guide and understand the human-review gate.

## Artifacts and state
- \`<workspace>/*.arc42.md\`: the twelve typed chapter files.
- \`<workspace>/architecture-evidence.md\`: the separate traceability file; it is not an arc42 chapter.
- The evidence file's \`OPEN:\` entries are the hand-off list for human decisions.
- If interrupted, inspect these artifacts and resume at the earliest incomplete step; do not restart
  or overwrite reviewed content.

## Step 1 — initialize the workspace
Run \`arc42 init template --dir <workspace>\`. Existing files are skipped, so rerunning is safe.
Check that the twelve expected \`*.arc42.md\` files exist. If a file already contains authored
content, preserve it and treat it as input to the inventory.

## Step 2 — create the evidence file
Run \`arc42 guide evidence\`, then create or update exactly \`<workspace>/architecture-evidence.md\`.
Record facts as you discover them; do not place proofs inside chapter files. Use \`OPEN:\` for every
missing decision, uncertain inference, or unresolved contradiction.

## Step 3 — inventory bounded sources
Inspect architecture-relevant sources in the repository root, including README and docs files,
existing ADRs, package/build configuration, Docker or deployment manifests, CI configuration, and
source entry points and module boundaries. Do not scan unrelated dependencies or the whole filesystem.
For each relevant source, record its path and line, symbol, or command output, what it establishes,
and confidence in the evidence file. Mark a source as examined-but-not-relevant only in your working
notes; do not manufacture architecture facts from absence.

## Step 4 — delegate wave 1
Run \`arc42 guide chapter 1\`, \`arc42 guide chapter 2\`, and \`arc42 guide chapter 5\` and give
each brief, the relevant evidence, and repository access to a qualified subagent. Ask each subagent
to return: the complete chapter content, new evidence rows, and \`OPEN:\` items. Wait for all three
before delegating dependent chapters, and review their IDs for consistency.

## Step 5 — delegate dependent chapters
After wave 1 is available, delegate chapters 3, 4, 6, 7, 8, 9, 10, and 11. Chapter 12 may run
independently. For every subagent, provide \`arc42 guide chapter <number>\`, the current evidence,
and the current referenced IDs. Require it to inspect before writing, use \`arc42 explain <type>\`
for block syntax, and return content, evidence rows, and open questions. If a subagent fails, record
the failure and resume that chapter; do not skip it or invent its result.

## STOP — human review gate
Do not validate or declare completion until a human reviews:
- all evidence rows with medium/low confidence or \`OPEN:\` markers;
- contradictory sources and facts based on inference rather than direct evidence; and
- a summary of what each chapter documents and which questions remain.
Ask the human to resolve or accept each open item. Keep unresolved decisions visible.

## Step 6 — final validation
Only after all chapter work and human review, run \`arc42 validate --dir <workspace>\`. Present every
error, warning, and hint to the human. Do not run an automatic repair loop or change content merely
to make validation pass without a documented architectural decision.

Request chapter-specific instructions with \`arc42 guide chapter <number>\`; request the evidence
format with \`arc42 guide evidence\`.`;
  }

  if (subcommand === "evidence") {
    return `# arc42 migration evidence

## Purpose
Maintain this document separately from all \`*.arc42.md\` chapters. It traces facts and important
relationships back to repository evidence and gives the coordinator a review list. It is not parsed
by the arc42 validator. Suggested location: \`<workspace>/architecture-evidence.md\`.

## Record format
For every fact used in a chapter, add a row when you discover it:

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| \`src/main.ts:12\` | the statement used in the architecture | ch.5 / element ID | high/medium/low | \`—\` or \`OPEN: ...\` |

## Rules
- Cite a file path and location, symbol, or command output. If no source exists, write \`agent inference\`.
- Mark \`agent inference\` as low confidence and add an \`OPEN:\` question for human review.
- Name the chapter and element ID in \`Used in\` once the fact is written into a chapter.
- For contradictory sources, record both rows and mark both \`OPEN: contradicts <source>\`.
- Record evidence before or together with chapter prose; never use evidence to justify an invented value.

Evidence is traceability, not a substitute for architectural judgment. The coordinator must present
all medium/low-confidence and \`OPEN:\` rows to a human before final validation.`;
  }

  if (subcommand === "chapter") {
    const item = chapter(Number(argument));
    if (!item) throw new Error("Chapter must be a number from 1 to 12.");
    const template = readFileSync(templatePath(assetDir, item.file), "utf8");
    return `# Chapter ${item.number}: ${item.title}

## Focus
${item.focus}

## Dependencies
${item.dependencies}

## Content to capture
${item.content}

## Your role
You are a chapter author subagent. Write this chapter only. Do not modify other chapters, invent
facts, or silently resolve uncertainty. Return the complete chapter content, new evidence rows, and
all unresolved items to the coordinator.

## Before you write
1. Read the starter template below.
2. Run \`arc42 get\` to inspect existing elements and IDs.
3. Run the relevant \`arc42 explain <type>\` commands below; run \`arc42 explain\` for the full catalog.
4. Read the evidence file and inspect only the cited repository sources relevant to this chapter.
5. Confirm that every cross-reference target exists, or report it as an \`OPEN:\` dependency.

## Authoring rules
- Use one \`##\` section per element: heading, prose explaining intent, then one fenced \`arc42\` block.
- Keep every \`:::block\` inside a \`\`\`arc42\`\`\` fence. Do not put two blocks under one heading.
- Do not invent IDs or field values. Omit unsupported values and record \`OPEN: <question>\` instead.
- Cite every derived fact in \`architecture-evidence.md\`, including important relationships.
- Preserve existing authored content unless the coordinator or human explicitly approves a change.

## When you are done
Return the complete chapter file, evidence rows in the evidence-table format, and a list of every
\`OPEN:\` item or unresolved cross-reference. Do not claim validation success; the coordinator runs
validation only after all chapters and the human review gate are complete.

## Relevant commands
${item.commands.map((command) => `- \`${command}\``).join("\n")}

## Starter template
\`\`\`markdown
${template.trimEnd()}
\`\`\`
`;
  }

  throw new Error("Unknown guide topic. Use migration, chapter <1-12>, or evidence.");
}

export { CHAPTERS };
