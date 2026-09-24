import { chapter as chapterFromDef, CHAPTERS } from "./chapters.ts";

export type Notation = "markdown" | "asciidoc";

function fileExtension(notation: Notation): string {
  return notation === "asciidoc" ? ".arc42.adoc" : ".arc42.md";
}

function chapterFilename(number: number, slug: string, notation: Notation): string {
  return `${String(number).padStart(2, "0")}-${slug}${fileExtension(notation)}`;
}

/**
 * Convert a Markdown starter template to an AsciiDoc equivalent.
 * Transforms:
 *   - `# Title` (h1) → `= Title`
 *   - ```arc42 ... ``` → [source,arc42]\n----\n...\n----
 *   - <!-- ... --> comment blocks → //// ... //// block comments
 */
function templateToAsciidoc(md: string): string {
  // Replace h1 heading
  let result = md.replace(/^# (.+)$/m, "= $1");

  // Replace ```arc42 ... ``` code fences (may span multiple lines)
  result = result.replace(/^```arc42\n([\s\S]*?)^```$/gm, "[source,arc42]\n----\n$1----");

  // Replace HTML block comments <!-- ... --> with AsciiDoc block comments //// ... ////
  result = result.replace(/^<!--\n([\s\S]*?)^-->/gm, (_, body: string) => {
    return "////\n" + body + "////";
  });

  return result;
}

export function guideText(
  subcommand = "migration",
  argument?: string,
  _assetDir = process.cwd(),
  notation: Notation = "markdown",
): string {
  const ext = fileExtension(notation);
  const isAdoc = notation === "asciidoc";

  if (subcommand === "migration") {
    return `# arc42 migration guide

## Your role
You are the migration coordinator. Produce a complete, typed arc42 architecture model from an
existing repository's documentation and source code. Delegate chapter authoring to qualified
subagents, maintain the evidence file, and own the review gates. Never invent architectural facts,
silently resolve contradictions, or automatically repair validation findings.

## Notation: ${isAdoc ? "AsciiDoc" : "Markdown"}
${
  isAdoc
    ? `This migration uses **AsciiDoc** notation. All chapter files use the \`.arc42.adoc\` extension.
DSL blocks use \`[source,arc42]\` + \`----\` fences instead of \`\`\`arc42\`\`\` fences.
Headings use \`= Title\` (h1), \`== Section\` (h2), \`=== Sub\` (h3) syntax.`
    : `This migration uses **Markdown** notation. All chapter files use the \`.arc42.md\` extension.
DSL blocks use \`\`\`arc42\`\`\` fences.`
}

## Objective and completion criteria
Produce twelve \`*${ext}\` chapter files and \`architecture-evidence.md\` in the selected
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
- \`<workspace>/*${ext}\`: the twelve typed chapter files.
- \`<workspace>/architecture-evidence.md\`: the separate traceability file; it is not an arc42 chapter.
- The evidence file's \`OPEN:\` entries are the hand-off list for human decisions.
- If interrupted, inspect these artifacts and resume at the earliest incomplete step; do not restart
  or overwrite reviewed content.

## Step 1 — initialize the workspace
${isAdoc ? `Create the twelve \`*${ext}\` chapter files manually or by copying an existing workspace. There is no AsciiDoc init template yet; use \`arc42 guide chapter <N> --notation asciidoc\` to get the starter template for each chapter.` : `Run \`arc42 init template --dir <workspace>\`. Existing files are skipped, so rerunning is safe.`}
Check that the twelve expected \`*${ext}\` files exist. If a file already contains authored
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
Run \`arc42 guide chapter 1${isAdoc ? " --notation asciidoc" : ""}\`, \`arc42 guide chapter 2${isAdoc ? " --notation asciidoc" : ""}\`, and \`arc42 guide chapter 5${isAdoc ? " --notation asciidoc" : ""}\` and give
each brief, the relevant evidence, and repository access to a qualified subagent. Ask each subagent
to return: the complete chapter content, new evidence rows, and \`OPEN:\` items. Wait for all three
before delegating dependent chapters, and review their IDs for consistency.

## Step 5 — delegate dependent chapters
After wave 1 is available, delegate chapters 3, 4, 6, 7, 8, 9, 10, and 11. Chapter 12 may run
independently. For every subagent, provide \`arc42 guide chapter <number>${isAdoc ? " --notation asciidoc" : ""}\`, the current evidence,
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

Request chapter-specific instructions with \`arc42 guide chapter <number>${isAdoc ? " --notation asciidoc" : ""}\`; request the evidence
format with \`arc42 guide evidence\`.`;
  }

  if (subcommand === "evidence") {
    return `# arc42 migration evidence

## Purpose
Maintain this document separately from all \`*${ext}\` chapters. It traces facts and important
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
    const item = chapterFromDef(Number(argument));
    if (!item) throw new Error("Chapter must be a number from 1 to 12.");
    const template = isAdoc ? templateToAsciidoc(item.template) : item.template;
    const chapterFile = chapterFilename(item.number, item.slug, notation);
    return `# Chapter ${item.number}: ${item.title}

## Notation: ${isAdoc ? "AsciiDoc" : "Markdown"}
${isAdoc ? `Write this chapter as \`${chapterFile}\`. Use AsciiDoc heading syntax (\`= Title\`, \`== Section\`, etc.) and wrap DSL blocks with \`[source,arc42]\` + \`----\` fences.` : `Write this chapter as \`${chapterFile}\`. Use Markdown heading syntax (\`# Title\`, \`## Section\`, etc.) and wrap DSL blocks with \`\`\`arc42\`\`\` fences.`}

## Dependencies
${item.dependencies}

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
${
  isAdoc
    ? `- Use one \`==\` section per element: heading, prose explaining intent, then one DSL block.
- Wrap every \`:::block\` inside a \`[source,arc42]\` + \`----\` fence. Do not put two blocks under one heading.
- Headings: \`= Title\` (document title / h1), \`== Section\` (h2), \`=== Sub-section\` (h3).
- Do NOT use Markdown \`# headings\` or \`\`\`arc42\`\`\` fences — these are not valid in AsciiDoc files.`
    : `- Use one \`##\` section per element: heading, prose explaining intent, then one fenced \`arc42\` block.
- Keep every \`:::block\` inside a \`\`\`arc42\`\`\` fence. Do not put two blocks under one heading.`
}
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
\`\`\`${isAdoc ? "asciidoc" : "markdown"}
${template.trimEnd()}
\`\`\`
`;
  }

  throw new Error("Unknown guide topic. Use migration, chapter <1-12>, or evidence.");
}

export { CHAPTERS };
