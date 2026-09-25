#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  createReadStream,
  watch,
} from "node:fs";
import { join, dirname, extname } from "node:path";
import { createServer } from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { discoverArc42Dir } from "./discover.ts";
import { fileURLToPath } from "node:url";
import {
  builtinRules,
  explainElement,
  explainDiagram,
  formatExplainText,
  formatExplainListText,
  formatExplainDiagramText,
  formatExplainDiagramListText,
  explainIgnore,
  formatExplainIgnoreText,
  lintArchitectureDiff,
  buildDiffView,
  ELEMENT_KIND_ORDER,
  computeCoverage,
} from "@arc42/core";
import { builtinGetRenderers, rendererById } from "./renderer/index.ts";
import type {
  BlockType,
  Diagnostic,
  DiagramType,
  DiffFinding,
  DiffPayload,
  DiffResult,
} from "@arc42/core";
import {
  getElements,
  loadDiffSnapshots,
  loadWorkspace,
  validateWorkspace,
} from "@arc42/workspace-fs";
import type { DiffSnapshots, DiffSpec } from "@arc42/workspace-fs";
import { commandHelp, rootHelp } from "./help.ts";
import { CHAPTERS, guideText, type Notation } from "./guide.ts";
import { formatCoverageTree } from "./coverage-tree.ts";

// Directory of the running CLI file — used to locate bundled assets
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version from the bundled package.json
const { version: VERSION } = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
) as { version: string };

// Canonical block-type list derived from core — single source of truth
const BLOCK_TYPES: readonly BlockType[] = ELEMENT_KIND_ORDER;

function isBlockType(s: string): s is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(s);
}

const DIAGRAM_TYPES: readonly DiagramType[] = [
  "context",
  "building-block",
  "sequence",
  "deployment",
  "generic",
];

function isDiagramType(s: string): s is DiagramType {
  return (DIAGRAM_TYPES as readonly string[]).includes(s);
}

const CHAPTER_NAMES: Record<number, string> = Object.fromEntries(
  CHAPTERS.map(({ number, title }) => [number, title]),
);

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
      root: { type: "string" },
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

  if (!command) {
    console.log(rootHelp());
    process.exit(0);
  }

  // Show help early — before directory resolution — so that running
  // `arc42 validate --help` from any directory doesn't trigger the
  // "multiple directories found" discovery warning.
  if (globalValues["help"] || commandArgs.includes("--help") || commandArgs.includes("-h")) {
    const help = commandHelp(command, commandArgs[0], BLOCK_TYPES);
    if (help) {
      console.log(help);
      process.exit(0);
    }
    // Unknown command — fall through to error handling below
  }

  // Guide output only uses bundled assets and must not trigger workspace discovery warnings.
  if (command === "guide") {
    runGuide(commandArgs);
  }

  const dir = resolveDir(globalValues["dir"] as string | undefined);
  const root = globalValues["root"] as string | undefined;

  if (command === "validate") {
    await runValidate(dir, root, commandArgs);
  } else if (command === "get") {
    await runGet(dir, commandArgs);
  } else if (command === "rules") {
    runRules(commandArgs);
  } else if (command === "explain") {
    runExplain(commandArgs);
  } else if (command === "serve") {
    await runServe(dir, commandArgs);
  } else if (command === "build") {
    await runBuild(dir, commandArgs);
  } else if (command === "diff") {
    await runDiff(dir, commandArgs);
  } else if (command === "coverage") {
    await runCoverage(dir, commandArgs);
  } else {
    console.error(`Unknown command: ${command}`);
    console.log(rootHelp());
    process.exit(2);
  }
}

function printDiffHelp() {
  console.log(commandHelp("diff", undefined, BLOCK_TYPES));
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

interface LoadedDiff {
  snapshots: DiffSnapshots;
  result: DiffResult;
  /** All findings, warnings first — the order `arc42 diff` prints them in. */
  findings: DiffFinding[];
  payload: DiffPayload;
}

/** Load both snapshots of a change, lint it and build its render-ready view. */
async function loadDiff(dir: string, spec: DiffSpec): Promise<LoadedDiff> {
  const snapshots = await loadDiffSnapshots(dir, spec);
  const result = lintArchitectureDiff({
    changes: snapshots.changes,
    base: snapshots.base.payload,
    head: snapshots.head.payload,
    baseKnownPaths: snapshots.base.knownPaths,
    headKnownPaths: snapshots.head.knownPaths,
  });
  const findings = [
    ...result.consistencyFindings,
    ...result.pathFindings,
    ...result.coverageFindings,
  ].sort(
    (a, b) =>
      Number(b.severity === "warning") - Number(a.severity === "warning") ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.kind.localeCompare(b.kind),
  );
  return {
    snapshots,
    result,
    findings,
    payload: {
      base: { label: snapshots.base.label, commit: snapshots.baseCommit },
      head: { label: snapshots.head.label },
      findings,
      view: buildDiffView(snapshots.base.payload, snapshots.head.payload, result.architecture),
    },
  };
}

/**
 * Read `--diff [<spec>] [--staged]` of serve and build. Returns undefined when
 * --diff is absent; a reference or --staged without --diff is a usage error.
 */
function diffSpecFromArgs(
  command: string,
  positionals: string[],
  values: { diff?: boolean | string; staged?: boolean | string },
): DiffSpec | undefined {
  if (!values.diff) {
    if (positionals.length > 0 || values.staged) {
      console.error(`arc42 ${command}: a reference and --staged require --diff`);
      process.exit(2);
    }
    return undefined;
  }
  if (positionals.length > 1) {
    console.error(
      `Usage: arc42 ${command} --diff [<reference> | <base>..<head> | <base>...<head>]`,
    );
    process.exit(2);
  }
  return { reference: positionals[0], staged: Boolean(values.staged) };
}

async function runDiff(dir: string, args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    printDiffHelp();
    process.exit(0);
  }
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      staged: { type: "boolean" },
      cached: { type: "boolean" },
      strict: { type: "boolean", default: false },
      format: { type: "string", default: "text" },
    },
  });
  if (positionals.length > 1) {
    console.error("Usage: arc42 diff [<reference> | <base>..<head> | <base>...<head>]");
    process.exit(2);
  }
  const format = values.format;
  if (format !== "text" && format !== "json") {
    console.error(`arc42 diff: unknown format '${format}'. Use text or json.`);
    process.exit(2);
  }

  try {
    const { snapshots, result, findings } = await loadDiff(dir, {
      reference: positionals[0],
      staged: Boolean(values.staged || values.cached),
    });
    const accepted =
      snapshots.acceptanceBase !== undefined &&
      process.env["ARC42_CONSISTENT"] === snapshots.acceptanceBase;
    const remainingFindings = accepted ? [] : findings;
    const hasStrictFindings =
      Boolean(values.strict) && remainingFindings.some((finding) => finding.severity === "hint");
    const exitCode =
      (remainingFindings.length > 0 && result.hasBlockingFindings) || hasStrictFindings ? 1 : 0;

    if (format === "json") {
      console.log(
        JSON.stringify(
          {
            version: 1,
            base: { label: snapshots.base.label, commit: snapshots.baseCommit },
            head: { label: snapshots.head.label },
            acceptanceBase: snapshots.acceptanceBase ?? null,
            accepted,
            hasBlockingFindings: result.hasBlockingFindings,
            findings,
            architecture: result.architecture,
          },
          null,
          2,
        ),
      );
      process.exit(exitCode);
    }

    // Emit consistency findings (warnings) as-is — they already have file:line context.
    // Group path hints by file so multiple elements on the same file appear on one line.
    const consistencyFindings = findings.filter(
      (f) => f.kind !== "implementation-path" && f.kind !== "new-building-block-hint",
    );
    const pathHints = findings.filter((f) => f.kind === "implementation-path");
    const coverageHints = result.coverageFindings;

    for (const finding of consistencyFindings) {
      console.log(`${finding.severity} ${finding.file}:${finding.line}  ${finding.message}`);
    }

    // Group path hints by changed file → collect element ids
    const hintsByFile = new Map<string, string[]>();
    for (const hint of pathHints) {
      const ids = hintsByFile.get(hint.file) ?? [];
      if (hint.elementId && !ids.includes(hint.elementId)) ids.push(hint.elementId);
      hintsByFile.set(hint.file, ids);
    }
    for (const [file, ids] of [...hintsByFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const elements = ids.length === 1 ? `'${ids[0]}'` : ids.map((id) => `'${id}'`).join(", ");
      console.log(
        `hint ${file}  review architecture element${ids.length === 1 ? "" : "s"} ${elements}`,
      );
    }

    // Emit coverage hints — each uncovered path on its own line
    for (const hint of coverageHints) {
      console.log(
        `hint ${hint.file}  not covered by any building block — consider adding a building-block element`,
      );
    }

    if (accepted) {
      console.log("info These changes were accepted as intentional");
    }
    if (remainingFindings.length > 0) {
      console.error(
        `To accept these findings, set ARC42_CONSISTENT=${snapshots.baseCommit} and rerun the command.`,
      );
    }
    process.exit(exitCode);
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

async function runValidate(dir: string, root: string | undefined, args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      format: { type: "string", default: "text" },
      quiet: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
    },
  });

  const format = values["format"] as string;
  const quiet = values["quiet"] as boolean;
  const strict = values["strict"] as boolean;

  try {
    const result = await validateWorkspace(dir, root);

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

    const hasHints = result.diagnostics.some((d) => d.severity === "hint");
    process.exit(!result.valid || (strict && hasHints) ? 1 : 0);
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

  // Special case: --type ignore lists ignore directives (not a block type)
  if (typeFlag === "ignore") {
    if (id) {
      console.error(
        `arc42 get --type ignore does not support a positional <id>. Omit the id to list all directives.`,
      );
      process.exit(2);
    }
    if (format !== "text" && format !== "json") {
      console.error(`--format '${format}' is not supported for --type ignore. Use text or json.`);
      process.exit(2);
    }
    try {
      const workspace = await loadWorkspace(dir);
      const directives = workspace.ignoreDirectives ?? [];
      if (format === "json") {
        console.log(JSON.stringify(directives, null, 2));
      } else {
        if (directives.length === 0) {
          console.log("No ignore directives found.");
        } else {
          for (const d of directives) {
            const reason = d.reason ? `  ${d.reason}` : "";
            console.log(`ignore  ${d.file}:${d.line}  ${d.ruleCode}${reason}`);
          }
        }
      }
      process.exit(0);
    } catch (err) {
      console.error(`Error: ${String(err)}`);
      process.exit(1);
    }
  }

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

  const format = values["format"] as string;

  // `arc42 explain ignore`
  if (positionals[0] === "ignore") {
    const result = explainIgnore();
    if (format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatExplainIgnoreText(result));
    }
    process.exit(0);
  }

  // `arc42 explain diagram [<type>]`
  if (positionals[0] === "diagram") {
    const diagramTypeArg = positionals[1];
    if (diagramTypeArg !== undefined && !isDiagramType(diagramTypeArg)) {
      console.error(
        `Unknown diagram type '${diagramTypeArg}'. Must be one of: ${DIAGRAM_TYPES.join(", ")}`,
      );
      process.exit(2);
    }
    if (diagramTypeArg) {
      const result = explainDiagram(diagramTypeArg as DiagramType);
      if (format === "json") {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatExplainDiagramText(result));
      }
    } else {
      const summaries = explainDiagram();
      if (format === "json") {
        console.log(JSON.stringify(summaries, null, 2));
      } else {
        console.log(formatExplainDiagramListText(summaries));
      }
    }
    process.exit(0);
  }

  const blockTypeArg = positionals[0];

  if (blockTypeArg !== undefined && !isBlockType(blockTypeArg)) {
    console.error(
      `Unknown block type '${blockTypeArg}'. Run \`arc42 explain\` to list block types, or \`arc42 explain diagram\` to list diagram types.`,
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
// guide
// ---------------------------------------------------------------------------

function runGuide(args: string[]) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      notation: { type: "string", default: "markdown" },
    },
    allowPositionals: true,
  });

  const subcommand = positionals[0] ?? "migration";
  const argument = positionals[1];
  const notationValue = values["notation"] as string;
  const notation: Notation =
    notationValue === "asciidoc" || notationValue === "markdown" ? notationValue : "markdown";
  try {
    console.log(guideText(subcommand, argument, __dirname, notation));
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
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
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      port: { type: "string", default: "3142" },
      open: { type: "boolean", default: false },
      diff: { type: "boolean", default: false },
      staged: { type: "boolean", default: false },
    },
    strict: false,
  });

  const port = parseInt(values["port"] as string, 10);
  const openBrowser = values["open"] as boolean;
  const diffSpec = diffSpecFromArgs("serve", positionals, values);
  const webDir = join(__dirname, "web");

  if (!existsSync(webDir)) {
    console.error(`Web assets not found at ${webDir}. Run 'pnpm build:web' first.`);
    process.exit(1);
  }

  // Keep the payloads in memory, but refresh them whenever a discovered document
  // (or, with --diff, the git index or HEAD) changes. The browser subscribes to
  // /api/workspace/events below.
  let workspaceJson: string;
  // With --diff: the serialized DiffPayload, or the error of the last reload.
  let diffJson: string | undefined;
  let diffError: string | undefined;
  let diffLabel = "";

  const load = async () => {
    if (!diffSpec) {
      workspaceJson = JSON.stringify(await loadWorkspace(dir));
      return;
    }
    const diff = await loadDiff(dir, diffSpec);
    workspaceJson = JSON.stringify(diff.snapshots.head.payload);
    diffJson = JSON.stringify(diff.payload);
    diffError = undefined;
    diffLabel = `${diff.payload.base.label} → ${diff.payload.head.label}`;
  };

  try {
    await load();
  } catch (err) {
    console.error(`Failed to load workspace from ${dir}: ${String(err)}`);
    process.exit(1);
  }

  const eventClients = new Set<import("node:http").ServerResponse>();
  let reloadTimer: NodeJS.Timeout | undefined;
  const watchers: import("node:fs").FSWatcher[] = [];

  const notifyClients = () => {
    for (const client of eventClients) client.write("event: workspace\ndata: changed\n\n");
  };

  const reloadWorkspace = () => {
    void load()
      .then(notifyClients)
      .catch((err: unknown) => {
        console.error(`Failed to reload workspace from ${dir}: ${String(err)}`);
        if (!diffSpec) return;
        // A diff that cannot be computed must not be shown as if it were
        // current: surface the error in the browser instead.
        diffError = String(err);
        notifyClients();
      });
  };

  const scheduleReload = () => {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(reloadWorkspace, 100);
  };

  const watchPath = (
    path: string,
    options: { recursive: boolean },
    accept: (f: string) => boolean,
  ) => {
    try {
      const watcher = watch(path, options, (_event, filename) => {
        if (accept(filename?.toString() ?? "")) scheduleReload();
      });
      watcher.on("error", (err) => console.error(`Failed to watch ${path}: ${String(err)}`));
      watchers.push(watcher);
    } catch (err) {
      console.error(`Failed to watch ${path}: ${String(err)}`);
    }
  };

  watchPath(
    dir,
    { recursive: true },
    (changed) => !changed || changed.endsWith(".arc42.md") || changed.endsWith(".arc42.adoc"),
  );
  if (diffSpec) {
    // The default comparison and --staged read the index; every comparison
    // resolves HEAD-relative references.
    const gitDir = execFileSync("git", ["-C", dir, "rev-parse", "--absolute-git-dir"], {
      encoding: "utf8",
    }).trim();
    watchPath(gitDir, { recursive: false }, (changed) => changed === "index" || changed === "HEAD");
  }

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    // API endpoint
    if (url === "/api/workspace" || url === "/api/workspace/") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(workspaceJson);
      return;
    }

    if (url === "/api/diff" || url === "/api/diff/") {
      if (!diffSpec) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "arc42 serve was started without --diff" }));
      } else if (diffError !== undefined) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: diffError }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(diffJson);
      }
      return;
    }

    if (url === "/api/workspace/events" || url === "/api/workspace/events/") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      eventClients.add(res);
      req.on("close", () => eventClients.delete(res));
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
    if (diffSpec) console.log(`  diff:      ${diffLabel}`);
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
      if (reloadTimer) clearTimeout(reloadTimer);
      for (const watcher of watchers) watcher.close();
      for (const client of eventClients) client.end();
      server.close();
      process.exit(0);
    });
  });
}

// ---------------------------------------------------------------------------
// coverage
// ---------------------------------------------------------------------------

async function runCoverage(dir: string, args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(commandHelp("coverage"));
    process.exit(0);
  }

  const { values } = parseArgs({
    args,
    options: {
      format: { type: "string", default: "text" },
    },
    strict: false,
  });

  const format = (values["format"] as string) || "text";
  if (format !== "text" && format !== "json" && format !== "tree") {
    console.error(`arc42 coverage: unknown format '${format}'. Use text, json, or tree.`);
    process.exit(2);
  }

  let payload: Awaited<ReturnType<typeof loadWorkspace>>;
  try {
    payload = await loadWorkspace(dir);
  } catch (err) {
    console.error(`Failed to load workspace from ${dir}: ${String(err)}`);
    process.exit(1);
  }

  const result = payload.coverage ?? computeCoverage(payload.elements, []);

  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  if (format === "tree") {
    console.log(formatCoverageTree(result));
    process.exit(0);
  }

  // Text output
  console.log("=== Path Coverage ===\n");

  if (result.covered.length > 0) {
    console.log(`Covered (${result.covered.length} paths):`);
    for (const { path, claimedBy, overlapping } of result.covered) {
      const ids = claimedBy.map((c) => c.id).join(", ");
      const overlapNote = overlapping ? " [shared]" : "";
      console.log(`  ${path.padEnd(40)} → ${ids}${overlapNote}`);
    }
    console.log();
  }

  if (result.uncovered.length > 0) {
    console.log(`Uncovered (${result.uncovered.length} paths):`);
    for (const path of result.uncovered) {
      console.log(`  ${path}`);
    }
    console.log();
  }

  const pct =
    result.totalFiles > 0 ? Math.round((result.coveredFileCount / result.totalFiles) * 100) : 0;
  console.log(`Coverage: ${result.coveredFileCount} of ${result.totalFiles} files (${pct}%)`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

async function runBuild(dir: string, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      base: { type: "string", default: "./" },
      diff: { type: "boolean", default: false },
      staged: { type: "boolean", default: false },
    },
    strict: false,
  });

  const outDir = values["out"] as string | undefined;
  const base = (values["base"] as string) || "./";

  if (!outDir) {
    console.error("arc42 build: --out <dir> is required");
    console.log(commandHelp("build", undefined, BLOCK_TYPES));
    process.exit(2);
  }

  const webDir = join(__dirname, "web");
  if (!existsSync(webDir)) {
    console.error(`Web assets not found at ${webDir}. Run 'pnpm build:web' first.`);
    process.exit(1);
  }

  // Load workspace — with --diff, the head snapshot of the difference
  const diffSpec = diffSpecFromArgs("build", positionals, values);
  let workspaceJson: string;
  let diffJson: string | undefined;
  try {
    if (diffSpec) {
      const diff = await loadDiff(dir, diffSpec);
      workspaceJson = JSON.stringify(diff.snapshots.head.payload);
      diffJson = JSON.stringify(diff.payload);
    } else {
      workspaceJson = JSON.stringify(await loadWorkspace(dir));
    }
  } catch (err) {
    console.error(`Failed to load workspace from ${dir}: ${String(err)}`);
    process.exit(1);
  }

  // Copy web assets to output directory
  mkdirSync(outDir, { recursive: true });
  cpSync(webDir, outDir, { recursive: true });

  // Inject workspace data into index.html
  const indexPath = join(outDir, "index.html");
  if (!existsSync(indexPath)) {
    console.error(`index.html not found in output directory ${outDir}`);
    process.exit(1);
  }

  let html = readFileSync(indexPath, "utf8");

  // Rewrite asset paths if a non-default base is provided.
  // The web SPA is built with absolute /assets/ paths; rewrite them to the
  // given base so the site works under a subpath (e.g. /arc42-language/docs/).
  if (base !== "./" && base !== "/") {
    html = html.replace(/src="\/assets\//g, `src="${base}assets/`);
    html = html.replace(/href="\/assets\//g, `href="${base}assets/`);
    // modulepreload links use crossorigin href without quotes after href=
    html = html.replace(/ href="\/assets\//g, ` href="${base}assets/`);
  }

  // Inject workspace before </head>
  // Escape "<" so that "</script>" inside a string cannot end the script element.
  const inlineJson = (json: string) => json.replaceAll("<", "\\u003c");
  const injection =
    `<script>window.__WORKSPACE__=${inlineJson(workspaceJson)};</script>` +
    (diffJson !== undefined ? `\n<script>window.__DIFF__=${inlineJson(diffJson)};</script>` : "");
  html = html.replace("</head>", `${injection}\n</head>`);

  writeFileSync(indexPath, html, "utf8");

  // Count output files for summary
  const countFiles = (d: string): number => {
    let n = 0;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      n += entry.isDirectory() ? countFiles(join(d, entry.name)) : 1;
    }
    return n;
  };

  const fileCount = countFiles(outDir);
  console.log(`arc42 build  →  ${outDir}  (${fileCount} files)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  const code = (err as { code?: string } | null)?.code;
  process.exit(code?.startsWith("ERR_PARSE_ARGS_") ? 2 : 1);
});
