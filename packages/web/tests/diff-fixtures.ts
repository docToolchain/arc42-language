/// <reference types="node" />

// Fixtures for architecture-diff e2e tests: a temporary Git repository with a
// copy of the bookstore example, committed, plus known uncommitted edits.

import { test as base, expect, type Page } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bookstoreDir = resolve(__dirname, "../../../examples/bookstore-backend");
export const cliPath = resolve(__dirname, "../../cli/dist/cli.mjs");

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function edit(root: string, file: string, from: string | RegExp, to: string) {
  const path = join(root, file);
  const content = readFileSync(path, "utf8");
  // A replacer function keeps "$&" and friends in `to` literal.
  const next = content.replace(from, () => to);
  if (next === content) throw new Error(`Fixture edit did not apply to ${file}: ${String(from)}`);
  writeFileSync(path, next);
}

export const BB = "05-building-blocks.arc42.md";
export const GLOSSARY = "12-glossary.arc42.md";

/**
 * Create a repository whose working tree differs from HEAD by:
 * - bb-catalog-service: technology changed without prose change (lint warning)
 * - "SMS Delivery Contract" section removed (element + section removed)
 * - "Idempotency Key" glossary term added in a new section
 * - glossary preamble prose changed, containing a literal "</script>" and "$&"
 */
export function createDiffRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-e2e-diff-"));
  cpSync(bookstoreDir, root, { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 e2e");
  git(root, "add", ".");
  git(root, "commit", "-qm", "initial architecture");

  edit(
    root,
    BB,
    "id: bb-catalog-service\ntitle: Catalog Service\ntechnology: Node.js / Express",
    "id: bb-catalog-service\ntitle: Catalog Service\ntechnology: Go",
  );
  edit(root, BB, /### SMS Delivery Contract\n[\s\S]*?:::\n```\n\n/, "");
  edit(
    root,
    GLOSSARY,
    "These definitions ensure all stakeholders share the same understanding.",
    "These definitions ensure all stakeholders share the same understanding. Terms are plain words, never `</script>` tags or `$&` patterns.",
  );
  writeFileSync(
    join(root, GLOSSARY),
    `${readFileSync(join(root, GLOSSARY), "utf8").trimEnd()}\n\n## Idempotency Key\n\nA client-chosen key that makes retried order submissions safe.\n\n\`\`\`arc42\n:::glossary-term\nid: term-idempotency-key\ntitle: Idempotency Key\ndefinition: A client-supplied key that lets the Order Service recognize and ignore duplicate submissions.\n:::\n\`\`\`\n`,
  );
  return root;
}

function commitAll(root: string, ...messages: string[]) {
  git(root, "add", "-A");
  git(root, "commit", "-q", ...messages.flatMap((message) => ["-m", message]));
}

/**
 * Create a repository with this architecture history, newest first:
 * - uncommitted: bb-order-service technology changed
 * - "style: reflow the glossary intro" — reformatting only (not semantic)
 * - "feat: switch the catalog to Go" — the edits of createDiffRepository, with a Markdown body
 * - "initial architecture" — root commit
 */
export function createHistoryRepository(): string {
  const root = createDiffRepository();
  commitAll(root, "feat: switch the catalog to Go", "Go keeps **p95 search latency** low.");
  edit(
    root,
    GLOSSARY,
    "These definitions ensure all stakeholders share the same understanding.",
    "These definitions ensure all stakeholders\nshare the same understanding.",
  );
  commitAll(root, "style: reflow the glossary intro");
  edit(
    root,
    BB,
    "id: bb-order-service\ntitle: Order Service\ntechnology: Node.js / Express",
    "id: bb-order-service\ntitle: Order Service\ntechnology: Kotlin",
  );
  return root;
}

const IGNORE = ":::ignore H014 This is only a demo for the arc42, code is out of scope:::";

/**
 * Create a repository with the bookstore example as its only commit, tagged
 * `v1.0` — the starting point of both demos.
 */
export function createBookstoreRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-demo-bookstore-"));
  cpSync(bookstoreDir, root, { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "architect@example.com");
  git(root, "config", "user.name", "Bookstore Architect");
  commitAll(root, "docs: initial bookstore architecture");
  git(root, "tag", "v1.0");
  return root;
}

/**
 * Create a repository that tells a short architecture story for the diff demo.
 * The first commit is tagged `v1.0`; on top of it, newest last:
 * - "feat: add book recommendations" — new service + API, gateway wired, diagram updated
 * - "perf: move catalog search to Go" — technology change, prose rewrite, new decision
 * - "style: reflow the API Gateway section" — formatting only (no model change)
 * - "refactor: rename Response Cache to Read Cache" — heading and title renamed
 * - uncommitted: the SMS Delivery Contract is removed, and the Message Queue's
 *   technology changes without a prose update (a lint warning)
 */
export function createEvolutionRepository(): string {
  const root = createBookstoreRepository();

  edit(
    root,
    BB,
    "\n## Order Service\n",
    `
## Recommendation Service

The Recommendation Service suggests books to readers. It ranks titles by a reader's order history and by what similar readers bought, and reads product details from the Catalog Service so that suggestions never show stale prices.

\`\`\`arc42
${IGNORE}

:::building-block
id: bb-recommendation-service
title: Recommendation Service
technology: Python / FastAPI
implements: concept-logging, concept-error-handling
requires: if-order-catalog
:::
\`\`\`

### Recommendation API

The gateway forwards \`/recommendations\` requests to this contract.

\`\`\`arc42
${IGNORE}

:::interface
id: if-gateway-recommend
title: Recommendation API
provider: bb-recommendation-service
protocol: HTTP/JSON
:::
\`\`\`

## Order Service
`,
  );
  edit(
    root,
    BB,
    "requires: if-gateway-catalog, if-gateway-order, if-gateway-auth",
    "requires: if-gateway-catalog, if-gateway-order, if-gateway-auth, if-gateway-recommend",
  );
  edit(
    root,
    BB,
    "and routes requests to the appropriate downstream service.",
    "and routes requests to the appropriate downstream service, including personalised book recommendations.",
  );
  edit(
    root,
    BB,
    '    bb-order-service["Order Service\\n(Node.js / Express)"]\n',
    '    bb-order-service["Order Service\\n(Node.js / Express)"]\n    bb-recommendation-service["Recommendation Service\\n(Python / FastAPI)"]\n',
  );
  edit(
    root,
    BB,
    '    bb-api-gateway -->|"if-gateway-auth"| bb-auth-service\n',
    '    bb-api-gateway -->|"if-gateway-auth"| bb-auth-service\n    bb-api-gateway -->|"if-gateway-recommend"| bb-recommendation-service\n    bb-recommendation-service -->|"if-order-catalog"| bb-catalog-service\n',
  );
  commitAll(
    root,
    "feat: add book recommendations",
    "Readers asked for **personalised suggestions**. A new Recommendation Service ranks books by order history; the gateway exposes it at `/recommendations`.",
  );

  edit(
    root,
    BB,
    "id: bb-catalog-service\ntitle: Catalog Service\ntechnology: Node.js / Express",
    "id: bb-catalog-service\ntitle: Catalog Service\ntechnology: Go",
  );
  edit(
    root,
    BB,
    "This caching strategy is critical for meeting the 200ms p95 search latency target.",
    "Together with the Go runtime, this caching strategy keeps search well within the 200ms p95 latency target.",
  );
  edit(
    root,
    BB,
    'bb-catalog-service["Catalog Service\\n(Node.js / Express)"]',
    'bb-catalog-service["Catalog Service\\n(Go)"]',
  );
  writeFileSync(
    join(root, "09-decisions.arc42.md"),
    `${readFileSync(join(root, "09-decisions.arc42.md"), "utf8").trimEnd()}

## Go for Catalog Search

Load tests showed the Node.js catalog search at 340ms p95 under peak traffic, well above the 200ms target. A Go implementation of the same endpoints stays below 120ms with a fraction of the memory, and the team already runs Go in other products.

\`\`\`arc42
:::decision
id: dec-go-catalog
title: Implement the Catalog Service in Go
status: accepted
date: 2026-09-01
addresses: qg-performance
:::
\`\`\`
`,
  );
  commitAll(
    root,
    "perf: move catalog search to Go",
    "Load tests showed **340 ms p95** for search on Node.js. The Go rewrite meets the 200 ms target.",
  );

  edit(
    root,
    BB,
    "It terminates TLS, validates JWT tokens, enforces rate limits, and routes",
    "It terminates TLS,\nvalidates JWT tokens, enforces rate limits, and routes",
  );
  commitAll(root, "style: reflow the API Gateway section");

  edit(root, BB, "## Response Cache\n", "## Read Cache\n");
  edit(root, BB, "id: bb-cache\ntitle: Response Cache", "id: bb-cache\ntitle: Read Cache");
  edit(root, BB, 'bb-cache["Response Cache\\n(Redis 7)"]', 'bb-cache["Read Cache\\n(Redis 7)"]');
  commitAll(root, "refactor: rename Response Cache to Read Cache");

  edit(root, BB, /### SMS Delivery Contract\n[\s\S]*?:::\n```\n\n/, "");
  // Changed without touching the section prose: the lint warns about it.
  edit(
    root,
    BB,
    "id: bb-message-queue\ntitle: Message Queue\ntechnology: AWS SQS",
    "id: bb-message-queue\ntitle: Message Queue\ntechnology: AWS SQS FIFO",
  );
  return root;
}

/** Serve a directory of static files, like a static host serving an `arc42 build` output. */
export async function serveStatic(
  root: string,
  port: number,
): Promise<{ url: string; stop: () => Promise<void> }> {
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".jsonl": "application/x-ndjson",
  };
  const server = createServer((req, res) => {
    const path = join(root, (req.url ?? "/").split("?")[0] === "/" ? "index.html" : req.url!);
    if (!existsSync(path)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
    res.end(readFileSync(path));
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${port}`,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export function runCli(...args: string[]): string {
  return execFileSync("node", [cliPath, ...args], { encoding: "utf8" });
}

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
  server.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, 2000))]);
  if (server.exitCode === null && server.signalCode === null) {
    server.kill("SIGKILL");
    await exited;
  }
}

/** Start `arc42 serve [...args]` for a directory and wait until it answers. */
export async function startServer(
  root: string,
  port: number,
  ...args: string[]
): Promise<{ url: string; stop: () => Promise<void> }> {
  const url = `http://localhost:${port}`;
  const server = spawn("node", [cliPath, "--dir", root, "serve", ...args, "--port", String(port)], {
    stdio: "ignore",
  });
  await waitForServer(`${url}/api/workspace`);
  return { url, stop: () => stopServer(server) };
}

/** Start `arc42 serve --diff [...args]` for a repository and wait until it answers. */
export function startDiffServer(
  root: string,
  port: number,
  ...args: string[]
): Promise<{ url: string; stop: () => Promise<void> }> {
  return startServer(root, port, "--diff", ...args);
}

type WorkerFixtures = { diffRepository: string; diffServerURL: string };

export const test = base.extend<object, WorkerFixtures>({
  diffRepository: [
    async ({ playwright }, use) => {
      void playwright;
      const root = createDiffRepository();
      try {
        await use(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    { scope: "worker" },
  ],

  diffServerURL: [
    async ({ diffRepository }, use, workerInfo) => {
      const server = await startDiffServer(diffRepository, 3300 + workerInfo.workerIndex);
      try {
        await use(server.url);
      } finally {
        await server.stop();
      }
    },
    { scope: "worker" },
  ],

  page: async ({ browser, diffServerURL }, use) => {
    const context = await browser.newContext({ baseURL: diffServerURL });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  request: async ({ playwright, diffServerURL }, use) => {
    const context = await playwright.request.newContext({ baseURL: diffServerURL });
    await use(context);
    await context.dispose();
  },
});

export { expect, type Page };
