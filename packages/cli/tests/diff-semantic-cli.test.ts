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

describe("arc42 diff — commit ranges", () => {
  function commitAll(root: string, message: string): string {
    git(root, "add", "-A");
    git(root, "commit", "-qm", message);
    return git(root, "rev-parse", "HEAD").trim();
  }

  test("lints the changes between two commits and accepts them with the base commit", () => {
    const root = repository(MD, markdown(SERVICE));
    const base = git(root, "rev-parse", "HEAD").trim();
    writeFileSync(join(root, MD), markdown(SERVICE.replace("Node", "Go")));
    commitAll(root, "switch to go");

    const result = runDiff(root, `${base}..HEAD`);
    expect(result.stdout).toContain(`warning ${MD}:8  Block 'service' changed`);
    expect(result.stderr).toContain(`ARC42_CONSISTENT=${base}`);
    expect(result.status).toBe(1);

    const accepted = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        "--conditions=development",
        cliPath,
        "--dir",
        root,
        "diff",
        `${base}..HEAD`,
      ],
      { encoding: "utf8", env: { ...process.env, ARC42_CONSISTENT: base } },
    );
    expect(accepted.stdout).toContain("info These changes were accepted as intentional");
    expect(accepted.status).toBe(0);
  });

  test("a symmetric range only reports the changes of the branch", () => {
    const root = repository(MD, markdown(SERVICE));
    const main = git(root, "rev-parse", "--abbrev-ref", "HEAD").trim();
    git(root, "checkout", "-qb", "feature");
    writeFileSync(join(root, "service.ts"), "export const service = true;\n");
    commitAll(root, "feature: code only");
    git(root, "checkout", "-q", main);
    writeFileSync(join(root, MD), markdown(SERVICE, "Main-only prose change."));
    commitAll(root, "main: prose only");

    const branchOnly = runDiff(root, `${main}...feature`);
    expect(branchOnly.stdout).toBe("");
    expect(branchOnly.status).toBe(0);

    const twoDot = runDiff(root, `${main}..feature`);
    expect(twoDot.stdout).toContain("Section prose changed without changing block 'service'.");
    expect(twoDot.status).toBe(1);
  });

  test("rejects a range combined with --staged", () => {
    const root = repository(MD, markdown(SERVICE));
    const result = runDiff(root, "HEAD..HEAD", "--staged");
    expect(result.stderr).toContain("cannot be combined with --staged");
    expect(result.status).toBe(1);
  });
});
