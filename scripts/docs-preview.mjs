#!/usr/bin/env node
// docs:preview — builds and serves the full GitHub Pages site locally.
// Usage: pnpm docs:preview [--port <n>] [--no-open]
//
// Steps:
//   1. pnpm run build        (builds CLI + web assets)
//   2. pnpm run build:site   (builds packages/site with base=/arc42-language/)
//   3. arc42 build for docs/ and bookstore/
//   4. serves with vite preview (or npx serve as fallback)

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, ".docs-preview");
const cliMjs = join(root, "packages/cli/dist/cli.mjs");
const siteDir = join(root, "packages/site/dist");

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: "string", default: "4173" },
    open: { type: "boolean", default: true },
    "no-open": { type: "boolean", default: false },
    "skip-build": { type: "boolean", default: false },
  },
  strict: false,
});

const port = parseInt(String(values["port"]), 10);
const shouldOpen = !values["no-open"] && values["open"] !== false;
const skipBuild = Boolean(values["skip-build"]);

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

// ── Build ──────────────────────────────────────────────────────────────────

if (!skipBuild) {
  run("pnpm run build");
  run("pnpm run build:site", { env: { ...process.env, VITE_BASE: "/arc42-language/" } });
} else {
  console.log("Skipping build (--skip-build)");
}

// ── Assemble ───────────────────────────────────────────────────────────────

if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(join(outDir, "arc42-language"), { recursive: true });

cpSync(siteDir, join(outDir, "arc42-language"), { recursive: true });

run(
  `node "${cliMjs}" --dir docs/arc42 build --out "${join(outDir, "arc42-language", "docs")}" --base /arc42-language/docs/`,
);
run(
  `node "${cliMjs}" --dir examples/bookstore-backend build --out "${join(outDir, "arc42-language", "bookstore")}" --base /arc42-language/bookstore/`,
);

// ── Serve ──────────────────────────────────────────────────────────────────

const url = `http://localhost:${port}/arc42-language/`;
console.log(`\n✓ Site assembled → ${outDir}`);
console.log(`  Opening ${url}\n`);

if (shouldOpen) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
}

// Use npx serve (zero extra dependencies)
const server = spawn(
  "npx",
  ["--yes", "serve", outDir, "--listen", String(port), "--no-clipboard"],
  { stdio: "inherit", cwd: root },
);

process.on("SIGINT", () => {
  server.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.kill();
  process.exit(0);
});
