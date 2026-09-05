#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  createReadStream,
} from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { discoverArc42Dir } from "./discover.ts";
import { fileURLToPath } from "node:url";
import {
  validateWorkspace,
  getElements,
  loadWorkspace,
  builtinRules,
  builtinGetRenderers,
  rendererById,
  explainElement,
  formatExplainText,
  formatExplainListText,
} from "@arc42/core";
import type { BlockType, Diagnostic } from "@arc42/core";

// Directory of the running CLI file — used to locate bundled assets
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version from the bundled package.json
const { version: VERSION } = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
) as { version: string };

const BLOCK_TYPES: BlockType[] = [
  "quality-goal",
  "quality-scenario",
  "constraint",
  "actor",
  "solution-strategy",
  "building-block",
  "interface",
  "concept",
  "decision",
  "risk",
  "glossary-term",
  "runtime-scenario",
  "deployment-node",
];

function isBlockType(s: string): s is BlockType {
  return (BLOCK_TYPES as string[]).includes(s);
}

const CHAPTER_NAMES: Record<number, string> = {
  0: "Document Structure",
  1: "Quality Goals",
  2: "Constraints",
  3: "System Scope and Context",
  4: "Solution Strategy",
  5: "Building Blocks",
  6: "Runtime View",
  7: "Deployment View",
  8: "Cross-cutting Concepts",
  9: "Architecture Decisions",
  11: "Risks and Technical Debt",
  12: "Glossary",
};

// ---------------------------------------------------------------------------
// Global flag parsing
// Resolution order: --dir flag > ARC42_DIR env > auto-discover (walk up + scan subdirs) > cwd
// ---------------------------------------------------------------------------

function resolveDir(flagDir: string | undefined): string {
  if (flagDir) return flagDir;
  if (process.env["ARC42_DIR"]) return process.env["ARC42_DIR"];
  const discovered = discoverArc42Dir(process.cwd());
  if (discovered) return discovered;
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
    console.log(`arc42 v${VERSION}`);
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
  } else if (command === "explain") {
    runExplain(commandArgs);
  } else if (command === "init") {
    runInit(commandArgs);
  } else if (command === "serve") {
    await runServe(dir, commandArgs);
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
  arc42 [--dir <path>] get [<id>] [--type <type>] [--format json|text|markdown]
  arc42 [--dir <path>] serve [--port <n>] [--open]
  arc42 [--dir <path>] rules [--chapter <0|1|2|3|4|5|6|7|8|9|10|11|12>] [--format json|text]
  arc42 explain [<blocktype>] [--format json|text]
  arc42 init skill [--path <dest>]
  arc42 init template [--dir <path>]

Global options:
  --dir <path>   Workspace root (default: $ARC42_DIR or cwd)
  -h, --help     Show this help
  -v, --version  Show version

Block types: ${BLOCK_TYPES.join(", ")}

Environment:
  ARC42_DIR      Default workspace directory

Tip: arc42 get --format markdown | glow -
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
        const errors = result.diagnostics.filter((d: Diagnostic) => d.severity === "error").length;
        const warnings = result.diagnostics.filter(
          (d: Diagnostic) => d.severity === "warning",
        ).length;
        const hints = result.diagnostics.filter((d: Diagnostic) => d.severity === "hint").length;
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
    console.error(
      `Unknown --format '${format}'. Available: ${builtinGetRenderers.map((r) => r.meta.id).join(", ")}`,
    );
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
    console.log(
      JSON.stringify(
        rules.map((r) => r.meta),
        null,
        2,
      ),
    );
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
      console.log(`         ${docs.rationale}`);
    }
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// explain
// ---------------------------------------------------------------------------

function runExplain(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      format: { type: "string", default: "text" },
    },
    allowPositionals: true,
  });

  const blockTypeArg = positionals[0];
  const format = values["format"] as string;

  if (blockTypeArg !== undefined && !isBlockType(blockTypeArg)) {
    console.error(
      `Unknown block type '${blockTypeArg}'. Must be one of: ${BLOCK_TYPES.join(", ")}`,
    );
    process.exit(2);
  }

  if (blockTypeArg) {
    const result = explainElement(blockTypeArg as BlockType);
    if (format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatExplainText(result));
    }
  } else {
    const summaries = explainElement();
    if (format === "json") {
      console.log(JSON.stringify(summaries, null, 2));
    } else {
      console.log(formatExplainListText(summaries));
    }
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

function runInit(args: string[]) {
  const subcommand = args[0];

  if (subcommand === "skill") {
    runInitSkill(args.slice(1));
  } else if (subcommand === "template") {
    runInitTemplate(args.slice(1));
  } else {
    console.error(
      `Usage:\n  arc42 init skill [--path <dest>]\n  arc42 init template [--dir <path>]`,
    );
    process.exit(2);
  }
}

function runInitSkill(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      path: { type: "string" },
    },
  });

  const dest =
    (values["path"] as string | undefined) ?? join(process.cwd(), ".agents/skills/arc42/SKILL.md");
  const src = join(__dirname, "skill/SKILL.md");

  if (!existsSync(src)) {
    console.error(`Bundled skill file not found at ${src}`);
    process.exit(1);
  }

  if (existsSync(dest)) {
    console.error(`File already exists: ${dest}\nUse --path to specify a different destination.`);
    process.exit(1);
  }

  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`Skill installed: ${dest}`);
  process.exit(0);
}

function runInitTemplate(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string" },
    },
  });

  const destDir = (values["dir"] as string | undefined) ?? process.cwd();
  const srcDir = join(__dirname, "templates");

  if (!existsSync(srcDir)) {
    console.error(`Bundled templates not found at ${srcDir}`);
    process.exit(1);
  }

  const files = readdirSync(srcDir).filter((f) => f.endsWith(".arc42.md"));

  if (files.length === 0) {
    console.error(`No template files found in ${srcDir}`);
    process.exit(1);
  }

  mkdirSync(destDir, { recursive: true });

  let copied = 0;
  let skipped = 0;

  for (const file of files) {
    const src = join(srcDir, file);
    const dest = join(destDir, basename(file));
    if (existsSync(dest)) {
      console.warn(`Skipping (already exists): ${dest}`);
      skipped++;
    } else {
      copyFileSync(src, dest);
      copied++;
    }
  }

  console.log(
    `Templates copied: ${copied} file(s) to ${destDir}${skipped > 0 ? ` (${skipped} skipped)` : ""}`,
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// serve
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
};

async function runServe(dir: string, args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: "string", default: "3142" },
      open: { type: "boolean", default: false },
    },
    strict: false,
  });

  const port = parseInt(values["port"] as string, 10);
  const openBrowser = values["open"] as boolean;
  const webDir = join(__dirname, "web");

  if (!existsSync(webDir)) {
    console.error(`Web assets not found at ${webDir}. Run 'pnpm build:web' first.`);
    process.exit(1);
  }

  // Load workspace once at startup
  let workspaceJson: string;
  try {
    const payload = await loadWorkspace(dir);
    workspaceJson = JSON.stringify(payload);
  } catch (err) {
    console.error(`Failed to load workspace from ${dir}: ${String(err)}`);
    process.exit(1);
  }

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    // API endpoint
    if (url === "/api/workspace" || url === "/api/workspace/") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(workspaceJson);
      return;
    }

    // Static SPA assets
    // Resolve path: "/" → "index.html", otherwise strip leading "/"
    let filePath = url === "/" ? join(webDir, "index.html") : join(webDir, url.split("?")[0]);

    // Prevent path traversal
    if (!filePath.startsWith(webDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (!existsSync(filePath)) {
      // SPA fallback: serve index.html for any unknown path (client-side routing)
      filePath = join(webDir, "index.html");
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    const stream = createReadStream(filePath);
    stream.on("error", () => {
      res.writeHead(500);
      res.end("Internal Server Error");
    });
    stream.pipe(res);
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://localhost:${port}`;
    console.log(`arc42 serve  →  ${url}`);
    console.log(`  workspace: ${dir}`);
    console.log(`  Press Ctrl+C to stop.`);

    if (openBrowser) {
      const cmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
    }
  });

  // Keep process alive
  await new Promise<void>((_, reject) => {
    server.on("error", reject);
    process.on("SIGINT", () => {
      server.close();
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
