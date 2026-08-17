#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  validateWorkspace,
  getElements,
  builtinRules,
  builtinGetRenderers,
  rendererById,
} from "@arc42/core";
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

const CHAPTER_NAMES: Record<number, string> = {
  1: "Quality Goals",
  5: "Building Blocks",
  8: "Cross-cutting Concepts",
  9: "Architecture Decisions",
};

// ---------------------------------------------------------------------------
// Global flag parsing
// Resolution order: --dir flag > ARC42_DIR env > cwd
// ---------------------------------------------------------------------------

function resolveDir(flagDir: string | undefined): string {
  if (flagDir) return flagDir;
  if (process.env["ARC42_DIR"]) return process.env["ARC42_DIR"];
  return process.cwd();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);

  // Parse global --dir before subcommand
  const { values: globalValues, positionals } = parseArgs({
    args: argv,
    options: {
      dir: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (globalValues["version"]) {
    console.log("arc42 v0.1.0");
    process.exit(0);
  }

  const command = positionals[0];
  const commandArgs = argv.slice(argv.indexOf(command ?? "") + (command ? 1 : 0));
  const dir = resolveDir(globalValues["dir"] as string | undefined);

  if (!command || globalValues["help"]) {
    printHelp();
    process.exit(0);
  }

  if (command === "validate") {
    await runValidate(dir, commandArgs);
  } else if (command === "get") {
    await runGet(dir, commandArgs);
  } else if (command === "rules") {
    runRules(commandArgs);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(2);
  }
}

function printHelp() {
  console.log(`arc42 — validate and query arc42 DSL files

Usage:
  arc42 [--dir <path>] validate [--format json|text] [--quiet]
  arc42 [--dir <path>] get [<id>] [--type <type>] [--format json|text]
  arc42 [--dir <path>] rules [--chapter <1|5|8|9>] [--format json|text]

Global options:
  --dir <path>   Workspace root (default: $ARC42_DIR or cwd)
  -h, --help     Show this help
  -v, --version  Show version

Block types: ${BLOCK_TYPES.join(", ")}

Environment:
  ARC42_DIR      Default workspace directory
`);
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

async function runValidate(dir: string, args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      format: { type: "string", default: "text" },
      quiet: { type: "boolean", default: false },
    },
  });

  const format = values["format"] as string;
  const quiet = values["quiet"] as boolean;

  try {
    const result = await validateWorkspace({ dir });

    if (format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!quiet || !result.valid) {
        for (const d of result.diagnostics) {
          if (quiet && d.severity !== "error") continue;
          console.log(`${d.severity} ${d.code}  ${d.file}:${d.line}  ${d.message}`);
        }
      }
      if (!quiet) {
        const errors = result.diagnostics.filter((d) => d.severity === "error").length;
        const warnings = result.diagnostics.filter((d) => d.severity === "warning").length;
        const hints = result.diagnostics.filter((d) => d.severity === "hint").length;
        console.log(`\n${errors} errors, ${warnings} warnings, ${hints} hints`);
      }
    }

    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

async function runGet(dir: string, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      type: { type: "string" },
      format: { type: "string", default: "text" },
    },
    allowPositionals: true,
  });

  const id = positionals[0];
  const typeFlag = values["type"] as string | undefined;
  const format = values["format"] as string;

  // Validate --type if provided
  if (typeFlag && !isBlockType(typeFlag)) {
    console.error(`Invalid --type '${typeFlag}'. Must be one of: ${BLOCK_TYPES.join(", ")}`);
    process.exit(2);
  }

  const renderer = rendererById.get(format);
  if (!renderer) {
    console.error(`Unknown --format '${format}'. Available: ${builtinGetRenderers.map((r) => r.meta.id).join(", ")}`);
    process.exit(2);
  }

  try {
    const result = await getElements({
      dir,
      query: id
        ? { kind: "element", id }
        : { kind: "workspace", typeFilter: typeFlag as BlockType | undefined },
    });

    // null = element not found
    if (result === null) {
      console.error(`Element '${id}' not found`);
      process.exit(1);
    }

    console.log(renderer.render(result));
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// rules
// ---------------------------------------------------------------------------

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
