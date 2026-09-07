import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const createdDirs: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function repository(): string {
  const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-cli-diff-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 test");
  writeFileSync(
    join(root, "architecture.arc42.md"),
    architecture("Initial prose", "Initial title"),
  );
  writeFileSync(join(root, "src.ts"), "export const value = 1;\n");
  git(root, "add", ".");
  git(root, "commit", "-qm", "initial");
  return root;
}

function architecture(prose: string, title: string): string {
  return `# Architecture\n\n## Service\n\n${prose}\n\n\`\`\`arc42\n:::building-block\nid: service\ntitle: ${title}\npath: src.ts\n:::\n\`\`\`\n`;
}

function runDiff(root: string, args: string[] = [], env?: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", cliPath, "--dir", root, "diff", ...args],
    { encoding: "utf8", env: { ...process.env, ...env } },
  );
}

describe("CLI architecture diff acceptance guidance", () => {
  test("advertises ARC42_CONSISTENT for a failing consistency diff", () => {
    const root = repository();
    writeFileSync(
      join(root, "architecture.arc42.md"),
      architecture("Changed prose", "Initial title"),
    );

    const result = runDiff(root, ["--strict"]);

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("ARC42_CONSISTENT=");
  });

  test("does not accept a token for a commit different from the comparison base", () => {
    const root = repository();
    const head = git(root, "rev-parse", "HEAD").trim();
    writeFileSync(
      join(root, "architecture.arc42.md"),
      architecture("Staged prose", "Initial title"),
    );
    git(root, "add", "architecture.arc42.md");
    writeFileSync(
      join(root, "architecture.arc42.md"),
      architecture("Working prose", "Initial title"),
    );

    const result = runDiff(root, [], { ARC42_CONSISTENT: head });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("ARC42_CONSISTENT=");
  });

  test("advertises ARC42_CONSISTENT when the diff contains only path hints", () => {
    const root = repository();
    writeFileSync(join(root, "src.ts"), "export const value = 2;\n");

    const result = runDiff(root, ["--strict"]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("hint ");
    expect(`${result.stdout}${result.stderr}`).toContain("ARC42_CONSISTENT=");
  });

  test("strict path hints can be accepted with the comparison base", () => {
    const root = repository();
    const base = git(root, "rev-parse", "HEAD").trim();
    writeFileSync(join(root, "src.ts"), "export const value = 2;\n");

    const result = runDiff(root, ["--strict"], { ARC42_CONSISTENT: base });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("hint ");
    expect(result.stdout).toContain(`ARC42_CONSISTENT accepted for comparison base ${base}`);
  });
});

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
