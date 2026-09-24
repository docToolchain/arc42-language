// Black-box tests for `arc42 diff` behaviour introduced by the semantic diff (#87).
import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const createdDirs: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function repository(file: string, content: string): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-cli-semantic-diff-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 test");
  writeFileSync(join(root, file), content);
  git(root, "add", ".");
  git(root, "commit", "-qm", "initial");
  return root;
}

function runDiff(root: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      "--conditions=development",
      cliPath,
      "--dir",
      root,
      "diff",
      ...args,
    ],
    { encoding: "utf8" },
  );
}

const MD = "architecture.arc42.md";

function markdown(block: string, prose = "The service owns orders."): string {
  return `# Architecture\n\n## Service\n\n${prose}\n\n\`\`\`arc42\n${block}\n\`\`\`\n`;
}

const SERVICE = ":::building-block\nid: service\ntitle: Service\ntechnology: Node\n:::";

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("arc42 diff — semantic comparison", () => {
  test("does not flag a reformatted block", () => {
    const root = repository(MD, markdown(SERVICE));
    writeFileSync(
      join(root, MD),
      markdown(":::building-block\ntechnology:   Node\ntitle: Service\nid: service\n:::"),
    );
    const result = runDiff(root);
    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  test("does not flag reflowed prose", () => {
    const root = repository(MD, markdown(SERVICE));
    writeFileSync(join(root, MD), markdown(SERVICE, "The service\nowns   orders."));
    const result = runDiff(root);
    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  test("flags a changed attribute without prose change", () => {
    const root = repository(MD, markdown(SERVICE));
    writeFileSync(join(root, MD), markdown(SERVICE.replace("Node", "Go")));
    const result = runDiff(root);
    expect(result.stdout).toContain(
      `warning ${MD}:8  Block 'service' changed without changing its section prose.`,
    );
    expect(result.status).toBe(1);
  });

  test("reads AsciiDoc on both sides", () => {
    const adoc = "architecture.arc42.adoc";
    const asciidoc = (technology: string) =>
      `= Architecture\n\n== Service\n\nThe service owns orders.\n\n[source,arc42]\n----\n:::building-block\nid: service\ntitle: Service\ntechnology: ${technology}\n:::\n----\n`;
    const root = repository(adoc, asciidoc("Node"));
    writeFileSync(join(root, adoc), asciidoc("Go"));
    const result = runDiff(root);
    expect(result.stdout).toContain(`warning ${adoc}:9  Block 'service' changed`);
    expect(result.stdout.match(/^warning /gm)).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  test("fails loudly on a snapshot that cannot be diffed", () => {
    const root = repository(MD, markdown(SERVICE));
    writeFileSync(
      join(root, MD),
      `${markdown(SERVICE)}\n## Copy\n\nA copy.\n\n\`\`\`arc42\n${SERVICE}\n\`\`\`\n`,
    );
    const result = runDiff(root);
    expect(result.stderr).toContain("Duplicate id 'service' in head snapshot (E001)");
    expect(result.status).toBe(1);
  });
});
