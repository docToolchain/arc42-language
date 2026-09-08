/// <reference types="node" />

import { test as base, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// ─── Server fixture ───────────────────────────────────────────────────────────
//
// Each worker gets its own arc42 serve process on a dedicated port.
// Worker-scoped: starts once per worker, shared across all tests in the worker.
// Tests always hit a fresh server with the current bookstore example.

const __dirname = dirname(fileURLToPath(import.meta.url));
const bookstoreDir = resolve(__dirname, "../../../examples/bookstore-backend");
const cliPath = resolve(__dirname, "../../cli/dist/cli.mjs");

async function waitForServer(url: string, timeoutMs = 8000): Promise<void> {
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

// Worker-scoped fixture: one arc42 serve per Playwright worker
type WorkerFixtures = { serverBaseURL: string };

export const test = base.extend<object, WorkerFixtures>({
  serverBaseURL: [
    async ({ playwright }, use, workerInfo) => {
      void playwright;
      const port = 3200 + workerInfo.workerIndex;
      const url = `http://localhost:${port}`;

      const server: ChildProcess = spawn(
        "node",
        [cliPath, "--dir", bookstoreDir, "serve", "--port", String(port)],
        { stdio: "ignore" },
      );

      server.on("error", (err: Error) => {
        throw new Error(`arc42 serve failed to start: ${err.message}`);
      });

      await waitForServer(`${url}/api/workspace`);
      try {
        await use(url);
      } finally {
        await stopServer(server);
      }
    },
    { scope: "worker" },
  ],

  // Override `page` to inject baseURL from the worker server.
  page: async ({ browser, serverBaseURL }, use) => {
    const context = await browser.newContext({ baseURL: serverBaseURL });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Override `request` so API tests also get the right baseURL.
  request: async ({ playwright, serverBaseURL }, use) => {
    const context = await playwright.request.newContext({ baseURL: serverBaseURL });
    await use(context);
    await context.dispose();
  },
});

export { expect, type Page };
