import { test as base, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

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

// Worker-scoped fixture: one arc42 serve per Playwright worker
type WorkerFixtures = { serverBaseURL: string };

export const test = base.extend<object, WorkerFixtures>({
  serverBaseURL: [
    async (_fixtures, use, workerInfo) => {
      const port = 3200 + workerInfo.workerIndex;
      const url = `http://localhost:${port}`;

      const server: ChildProcess = spawn(
        "node",
        [cliPath, "--dir", bookstoreDir, "serve", "--port", String(port)],
        { stdio: "pipe" },
      );

      server.on("error", (err) => {
        throw new Error(`arc42 serve failed to start: ${err.message}`);
      });

      await waitForServer(`${url}/api/workspace`);
      await use(url);

      server.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 200));
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
