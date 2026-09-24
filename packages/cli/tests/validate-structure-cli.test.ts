import { afterEach, describe, expect, test } from "vite-plus/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const createdDirs: string[] = [];

function workspace(fileName: string, content: string): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-cli-structure-"));
  createdDirs.push(root);
  writeFileSync(join(root, fileName), content);
  return root;
}

function validate(root: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      "--conditions=development",
      cliPath,
      "--dir",
      root,
      "validate",
      ...args,
    ],
    { encoding: "utf8" },
  );
}

const markdownBlock = "```arc42\n:::building-block\nid: service\ntitle: Service\n:::\n```\n";

describe("CLI validate — blocks must live in a section", () => {
  test("fails for a Markdown block above the first heading", () => {
    const root = workspace(
      "architecture.arc42.md",
      `${markdownBlock}\n# Architecture\n\n## Service\n\nThe service.\n`,
    );
    const result = validate(root);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/E017.*architecture\.arc42\.md:2/);
  });

  test("fails for an AsciiDoc document without headings", () => {
    const root = workspace(
      "architecture.arc42.adoc",
      "The service.\n\n[source,arc42]\n----\n:::building-block\nid: service\ntitle: Service\n:::\n----\n",
    );
    const result = validate(root, "--format", "json");
    expect(result.status).toBe(1);
    const codes = JSON.parse(result.stdout).diagnostics.map((d: { code: string }) => d.code);
    expect(codes).toContain("E017");
  });

  test("passes when every block sits under a heading", () => {
    const root = workspace(
      "architecture.arc42.md",
      `# Architecture\n\n## Service\n\nThe service.\n\n${markdownBlock}`,
    );
    const result = validate(root, "--format", "json");
    const codes = JSON.parse(result.stdout).diagnostics.map((d: { code: string }) => d.code);
    expect(codes).not.toContain("E017");
    expect(result.status).toBe(0);
  });
});

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
