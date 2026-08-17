#!/usr/bin/env node
import { parseArgs } from "node:util";
import { validateWorkspace, listElements, showElement, builtinRules } from "@arc42/core";
import type { BlockType } from "@arc42/core";

const BLOCK_TYPES: BlockType[] = [
  "quality-goal",
  "building-block",
  "interface",
  "concept",
  "decision",
];

function isBlockType(s: string): s is BlockType {
  return (BLOCK_TYPES as string[]).includes(s);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  if (command === "validate") {
    await runValidate(argv.slice(1));
  } else if (command === "list") {
    await runList(argv.slice(1));
  } else if (command === "show") {
    await runShow(argv.slice(1));
  } else if (command === "check") {
    await runCheck(argv.slice(1));
  } else if (command === "rules") {
    runRules(argv.slice(1));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  console.log(`arc42 — validate and query arc42 DSL files

Usage:
  arc42 validate [--dir <path>] [--format json|text]
  arc42 list <type> [--dir <path>] [--format json|text]
  arc42 show <id> [--dir <path>] [--format json|text]
  arc42 check <id> [--dir <path>] [--format json|text]
  arc42 rules [--chapter <1|5|8|9>] [--format json|text]

Block types: ${BLOCK_TYPES.join(", ")}
`);
}

async function runValidate(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string", default: process.cwd() },
      format: { type: "string", default: "json" },
    },
  });

  const dir = values["dir"] as string;
  const format = values["format"] as string;

  try {
    const result = await validateWorkspace({ dir });

    if (format === "text") {
      for (const d of result.diagnostics) {
        console.log(`${d.severity} ${d.code}  ${d.file}:${d.line}  ${d.message}`);
      }
      const errors = result.diagnostics.filter((d) => d.severity === "error").length;
      const warnings = result.diagnostics.filter((d) => d.severity === "warning").length;
      const hints = result.diagnostics.filter((d) => d.severity === "hint").length;
      console.log(`\n${errors} errors, ${warnings} warnings, ${hints} hints`);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

async function runList(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      dir: { type: "string", default: process.cwd() },
      format: { type: "string", default: "json" },
    },
    allowPositionals: true,
  });

  const type = positionals[0];
  if (!type || !isBlockType(type)) {
    console.error(`Invalid or missing type. Must be one of: ${BLOCK_TYPES.join(", ")}`);
    process.exit(1);
  }

  const dir = values["dir"] as string;
  const format = values["format"] as string;

  try {
    const elements = await listElements({ dir, type });

    if (format === "text") {
      for (const el of elements) {
        console.log(`${el.id}  ${el.title}  (${el.loc.file}:${el.loc.line})`);
      }
    } else {
      console.log(JSON.stringify(elements, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

async function runShow(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      dir: { type: "string", default: process.cwd() },
      format: { type: "string", default: "json" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  if (!id) {
    console.error("Missing element id");
    process.exit(1);
  }

  const dir = values["dir"] as string;
  const format = values["format"] as string;

  try {
    const result = await showElement({ dir, id });

    if (!result) {
      console.error(`Element '${id}' not found`);
      process.exit(1);
    }

    if (format === "text") {
      const { element, refsFrom, refsTo } = result;
      console.log(`[${element.kind}] ${element.id}  ${element.title}`);
      console.log(`Location: ${element.loc.file}:${element.loc.line}`);
      if (refsFrom.length > 0) {
        console.log(`\nReferences:`);
        for (const e of refsFrom) console.log(`  → ${e.id}  ${e.title}`);
      }
      if (refsTo.length > 0) {
        console.log(`\nReferenced by:`);
        for (const e of refsTo) console.log(`  ← ${e.id}  ${e.title}`);
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

async function runCheck(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      dir: { type: "string", default: process.cwd() },
      format: { type: "string", default: "json" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  if (!id) {
    console.error("Missing element id");
    process.exit(1);
  }

  const dir = values["dir"] as string;
  const format = values["format"] as string;

  try {
    const [showResult, validateResult] = await Promise.all([
      showElement({ dir, id }),
      validateWorkspace({ dir }),
    ]);

    if (!showResult) {
      console.error(`Element '${id}' not found`);
      process.exit(1);
    }

    // Filter diagnostics related to this element's file/line
    const related = validateResult.diagnostics.filter(
      (d) =>
        d.file === showResult.element.loc.file &&
        d.line === showResult.element.loc.line,
    );

    const output = { element: showResult, diagnostics: related };

    if (format === "text") {
      console.log(`[${showResult.element.kind}] ${showResult.element.id}  ${showResult.element.title}`);
      if (related.length === 0) {
        console.log("No diagnostics.");
      } else {
        for (const d of related) {
          console.log(`  ${d.severity} ${d.code}  ${d.message}`);
        }
      }
    } else {
      console.log(JSON.stringify(output, null, 2));
    }

    const hasErrors = related.some((d) => d.severity === "error");
    process.exit(hasErrors ? 1 : 0);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

const CHAPTER_NAMES: Record<number, string> = {
  1: "Quality Goals",
  5: "Building Blocks",
  8: "Cross-cutting Concepts",
  9: "Architecture Decisions",
};

function runRules(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      chapter: { type: "string" },
      format: { type: "string", default: "text" },
    },
  });

  const chapterFilter = values["chapter"] ? Number(values["chapter"]) : null;
  const format = values["format"] as string;

  let rules = [...builtinRules];
  if (chapterFilter !== null) {
    rules = rules.filter((r) => r.meta.docs.arc42Chapter === chapterFilter);
  }

  if (format === "json") {
    console.log(JSON.stringify(rules.map((r) => r.meta), null, 2));
    process.exit(0);
  }

  // Text: group by chapter
  const byChapter = new Map<number, typeof rules>();
  for (const rule of rules) {
    const ch = rule.meta.docs.arc42Chapter;
    const group = byChapter.get(ch) ?? [];
    group.push(rule);
    byChapter.set(ch, group);
  }

  for (const [chapter, chRules] of [...byChapter.entries()].sort(([a], [b]) => a - b)) {
    console.log(`\n## Chapter ${chapter} — ${CHAPTER_NAMES[chapter] ?? "Other"}\n`);
    for (const rule of chRules) {
      const { code, severity, type, docs } = rule.meta;
      console.log(`  ${code}  [${severity}/${type}]  ${docs.description}`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
