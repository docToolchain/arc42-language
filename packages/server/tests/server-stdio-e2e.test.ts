import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: unknown;
  result?: any;
  error?: { code: number; message: string };
};

const REQUEST_TIMEOUT_MS = 5_000;
const EXIT_TIMEOUT_MS = 5_000;

class StdioClient {
  private readonly process: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  private nextId = 0;
  private readonly pending = new Map<
    number,
    {
      resolve: (message: JsonRpcMessage) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly notifications: JsonRpcMessage[] = [];
  private readonly notificationWaiters: Array<(message: JsonRpcMessage) => void> = [];
  private exitPromise: Promise<number | null>;

  constructor(entrypoint: string) {
    const args = entrypoint.endsWith(".ts")
      ? ["--experimental-transform-types", "--no-warnings", entrypoint]
      : [entrypoint];
    this.process = spawn(process.execPath, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.process.stdout.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.readMessages();
    });
    this.process.on("error", (error) => this.rejectPending(error));
    this.process.on("exit", (code, signal) => {
      if (code !== 0 && signal === null) {
        this.rejectPending(new Error(`Server exited with code ${code}`));
      } else if (this.pending.size > 0) {
        this.rejectPending(new Error("Server exited before responding"));
      }
    });
    this.exitPromise = new Promise((resolve) => {
      this.process.once("exit", (code) => resolve(code));
    });
  }

  request(method: string, params?: unknown): Promise<JsonRpcMessage> {
    const id = ++this.nextId;
    const message = { jsonrpc: "2.0", id, method, params } satisfies JsonRpcMessage;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.write(message);
    });
  }

  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: "2.0", method, params });
  }

  waitForNotification(method: string): Promise<JsonRpcMessage> {
    const index = this.notifications.findIndex((message) => message.method === method);
    if (index >= 0) return Promise.resolve(this.notifications.splice(index, 1)[0]);
    return new Promise((resolve) => this.notificationWaiters.push(resolve));
  }

  async waitForExit(): Promise<number | null> {
    return this.exitPromise;
  }

  endInput(): void {
    this.process.stdin.end();
  }

  async close(): Promise<number | null> {
    if (this.process.exitCode !== null) return this.process.exitCode;
    try {
      await this.request("shutdown");
      this.notify("exit");
      this.process.stdin.end();
      return await Promise.race([
        this.exitPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timed out waiting for server exit")), EXIT_TIMEOUT_MS),
        ),
      ]);
    } finally {
      if (this.process.exitCode === null) this.process.kill();
    }
  }

  private write(message: JsonRpcMessage): void {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    this.process.stdin.write(
      Buffer.concat([Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`, "ascii"), body]),
    );
  }

  private readMessages(): void {
    while (true) {
      const separator = this.buffer.indexOf(Buffer.from("\r\n\r\n"));
      if (separator < 0) return;
      const header = this.buffer.subarray(0, separator).toString("ascii");
      const match = /^Content-Length:\s*(\d+)$/i.exec(header);
      if (!match) throw new Error(`Invalid LSP header: ${header}`);
      const length = Number(match[1]);
      const bodyStart = separator + 4;
      if (this.buffer.length < bodyStart + length) return;
      const body = this.buffer.subarray(bodyStart, bodyStart + length);
      this.buffer = this.buffer.subarray(bodyStart + length);
      const message = JSON.parse(body.toString("utf8")) as JsonRpcMessage;
      if (message.id === undefined) {
        const waiter = this.notificationWaiters.shift();
        if (waiter) waiter(message);
        else this.notifications.push(message);
        continue;
      }
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      pending.resolve(message);
    }
  }

  private rejectPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      this.pending.delete(id);
      pending.reject(error);
    }
  }
}

function serverEntrypoint(): string {
  const root = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(readFileSync(join(root, "..", "package.json"), "utf8")) as {
    bin: string | Record<string, string>;
  };
  const bin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin["arc42-language-server"];
  const entrypoint = join(root, "..", bin);
  expect(bin).toBe("./dist/server.mjs");
  expect(existsSync(entrypoint)).toBe(true);
  return entrypoint;
}

describe("server stdio E2E smoke", () => {
  let client: StdioClient;

  beforeEach(() => {
    client = new StdioClient(serverEntrypoint());
  });

  afterEach(async () => {
    await client.close();
  });

  test("launches the packaged bin and completes the initialize and clean lifecycle", async () => {
    const initialize = await client.request("initialize", {
      processId: process.pid,
      clientInfo: { name: "arc42-stdio-smoke" },
      capabilities: {},
      workspaceFolders: null,
    });

    expect(initialize.error).toBeUndefined();
    expect(initialize.result.serverInfo).toEqual({
      name: "arc42-language-server",
      version: "0.1.0",
    });
    expect(initialize.result.capabilities).toMatchObject({
      textDocumentSync: expect.anything(),
      completionProvider: expect.anything(),
      hoverProvider: true,
    });

    client.notify("initialized");
    const uri = "file:///stdio-sync.arc42.md";
    client.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: "markdown", version: 1, text: "one\r\ntwo" },
    });
    client.notify("textDocument/didChange", {
      textDocument: { uri, version: 2 },
      contentChanges: [
        { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }, text: "😀" },
      ],
    });
    client.notify("textDocument/didChange", {
      textDocument: { uri, version: 1 },
      contentChanges: [{ text: "stale" }],
    });
    client.notify("textDocument/didClose", { textDocument: { uri } });
    const shutdown = await client.request("shutdown");
    expect(shutdown).toMatchObject({ jsonrpc: "2.0", result: null });
    client.notify("exit");
    client.endInput();
    await expect(client.waitForExit()).resolves.toBe(0);
  }, 15_000);

  test("publishes diagnostics for invalid, valid, and changed documents", async () => {
    const uri = "file:///diagnostics.arc42.md";
    client.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "markdown",
        version: 1,
        text: "# Architecture\n\n:::decision\ntitle: Missing id\n:::",
      },
    });
    const invalid = await client.waitForNotification("textDocument/publishDiagnostics");
    expect(invalid.params).toMatchObject({ uri });
    const invalidParams = invalid.params as {
      uri: string;
      diagnostics: Array<{ range: unknown }>;
    };
    expect(invalidParams.diagnostics[0]).toMatchObject({ severity: 1, code: "E005" });
    expect(invalidParams.diagnostics[0].range).toEqual({
      start: { line: expect.any(Number), character: expect.any(Number) },
      end: { line: expect.any(Number), character: expect.any(Number) },
    });

    client.notify("textDocument/didChange", {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: "# Architecture\n\nValid prose." }],
    });
    let cleared = await client.waitForNotification("textDocument/publishDiagnostics");
    while ((cleared.params as { diagnostics: unknown[] }).diagnostics.length > 0) {
      cleared = await client.waitForNotification("textDocument/publishDiagnostics");
    }
    expect(cleared.params).toEqual({ uri, diagnostics: [] });
  }, 15_000);
});
