import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
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
      if (message.id === undefined) continue;
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

  beforeAll(() => {
    client = new StdioClient(serverEntrypoint());
  });

  afterAll(async () => {
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
    const shutdown = await client.request("shutdown");
    expect(shutdown).toMatchObject({ jsonrpc: "2.0", result: null });
    client.notify("exit");
    client.endInput();
    await expect(client.waitForExit()).resolves.toBe(0);
  }, 15_000);
});
