import { afterEach, describe, expect, test } from "vite-plus/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const createdDirs: string[] = [];

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-cli-workspace-"));
  createdDirs.push(root);
  writeFileSync(
    join(root, "nested.arc42.md"),
    "# Architecture\n\n## Service\n\nThe service.\n\n```arc42\n:::building-block\nid: service\ntitle: Service\n:::\n```\n",
  );
  return root;
}

function run(root: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      "--conditions=development",
      cliPath,
      "--dir",
      root,
      ...args,
    ],
    { encoding: "utf8" },
  );
}

describe("CLI filesystem workspace integration", () => {
  test("loads a recursively discovered workspace for validation and querying", () => {
    const root = workspace();
    const validation = run(root, "validate", "--format", "json");
    expect(validation.status).toBe(0);
    expect(JSON.parse(validation.stdout).version).toBe(1);

    const query = run(root, "get", "--format", "json");
    expect(query.status).toBe(0);
    expect(
      JSON.parse(query.stdout).elements.map((element: { id: string }) => element.id),
    ).toContain("service");
  });
});

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
