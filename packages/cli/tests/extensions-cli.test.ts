import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const ownDocs = fileURLToPath(new URL("../../../docs/arc42", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const cliArgs = [
  "--experimental-strip-types",
  "--no-warnings",
  "--conditions=development",
  cliPath,
];

const BLOCKS = join("05-building-blocks.arc42.md");

let dir: string;

function run(...args: string[]) {
  return spawnSync(process.execPath, [...cliArgs, "--dir", dir, "--root", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

/** Rewrite the block `id: bb-core` with extra attribute lines. */
function addAttributes(...lines: string[]) {
  const file = join(dir, BLOCKS);
  const text = readFileSync(file, "utf8");
  expect(text).toContain("\nid: bb-core\n");
  writeFileSync(file, text.replace("\nid: bb-core\n", `\nid: bb-core\n${lines.join("\n")}\n`));
}

// The workspace is this repository's own architecture, which validates --strict.
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arc42-ext-"));
  cpSync(ownDocs, dir, { recursive: true });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("x-* custom attributes (#130)", () => {
  test("validate --strict is clean with x-phase on a building-block", () => {
    const baseline = run("validate", "--strict");
    expect(baseline.status).toBe(0);

    addAttributes("x-phase: explore", "x-actor: agent");
    const result = run("validate", "--strict", "--format", "json");
    expect(result.status).toBe(0);
    const codes = (JSON.parse(result.stdout).diagnostics as { code: string }[]).map((d) => d.code);
    expect(codes).not.toContain("WG01");
  });

  test("get <id> --format json carries the attributes as extensions", () => {
    const result = run("get", "bb-core", "--format", "json");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).element.extensions).toEqual({
      phase: "explore",
      actor: "agent",
    });
  });

  test("get --type building-block --format json carries the attributes", () => {
    const result = run("get", "--type", "building-block", "--format", "json");
    expect(result.status).toBe(0);
    const elements = JSON.parse(result.stdout).elements as {
      id: string;
      extensions?: Record<string, string>;
    }[];
    const withPhase = elements.filter((e) => e.extensions?.["phase"] === "explore");
    expect(withPhase.map((e) => e.id)).toEqual(["bb-core"]);
    // blocks without x-* attributes get no extensions field
    expect(elements.find((e) => e.id === "bb-parser")).not.toHaveProperty("extensions");
  });

  test("a misspelled standard attribute is still WG01", () => {
    addAttributes("parnet: bb-cli");
    const result = run("validate", "--format", "json");
    const wg01 = (JSON.parse(result.stdout).diagnostics as { code: string; message: string }[])
      .filter((d) => d.code === "WG01")
      .map((d) => d.message);
    expect(wg01).toHaveLength(1);
    expect(wg01[0]).toContain("'parnet'");
  });

  test("explain lists the x-* attributes", () => {
    const result = run("explain", "building-block", "--format", "json");
    expect(JSON.parse(result.stdout).authoringTips.join("\n")).toContain("x-*");
  });
});

describe("output piped to another process", () => {
  // Pipe buffers are 64 KiB; a consumer that reads late must still get it all.
  test("get --format json is complete beyond 64 KiB", async () => {
    const blocks = Array.from(
      { length: 400 },
      (_, i) =>
        `## Bulk ${i}\n\nGenerated block ${i}.\n\n\`\`\`arc42\n:::building-block\nid: bb-bulk-${i}\ntitle: Bulk ${i}\nx-note: ${"n".repeat(120)}\n:::\n\`\`\`\n`,
    ).join("\n");
    const file = join(dir, BLOCKS);
    writeFileSync(file, readFileSync(file, "utf8") + "\n" + blocks);

    const child = spawn(
      process.execPath,
      [
        ...cliArgs,
        "--dir",
        dir,
        "--root",
        repoRoot,
        "get",
        "--type",
        "building-block",
        "--format",
        "json",
      ],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    child.stdout.pause();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stdout.resume();
    await new Promise((resolve) => child.on("close", resolve));

    const output = Buffer.concat(chunks).toString("utf8");
    expect(output.length).toBeGreaterThan(65536 * 2);
    const elements = JSON.parse(output).elements as { id: string }[];
    expect(elements.filter((e) => e.id.startsWith("bb-bulk-"))).toHaveLength(400);
  }, 30_000);
});
