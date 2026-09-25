// Black-box tests: real Git repositories, public package API only.
import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { diffWorkspaces } from "@arc42/core";
import { EMPTY_TREE, loadDiffSnapshots } from "../src/index.ts";

const createdDirs: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function write(root: string, path: string, content: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function commit(root: string, message: string): string {
  git(root, "add", "-A");
  git(root, "commit", "-qm", message);
  return git(root, "rev-parse", "HEAD").trim();
}

function repository(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-diff-snapshots-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 test");
  for (const [path, content] of Object.entries(files)) write(root, path, content);
  commit(root, "initial");
  return root;
}

function markdown(prose: string, technology = "Node"): string {
  return `# Building Block View\n\n## Service\n\n${prose}\n\n\`\`\`arc42\n:::building-block\nid: service\ntitle: Service\ntechnology: ${technology}\n:::\n\`\`\`\n`;
}

function asciidoc(prose: string, technology = "Node"): string {
  return `= Building Block View\n\n== Service\n\n${prose}\n\n[source,arc42]\n----\n:::building-block\nid: service\ntitle: Service\ntechnology: ${technology}\n:::\n----\n`;
}

const FILE = "docs/05-building-blocks.arc42.md";

function serviceTechnology(payload: { elements: Array<{ id: string }> }): unknown {
  return (payload.elements.find((element) => element.id === "service") as { technology?: string })
    ?.technology;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("loadDiffSnapshots — comparison scopes", () => {
  test("compares the working tree with the index by default", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    write(root, FILE, markdown("Owns orders.", "Go"));
    git(root, "add", FILE);
    write(root, FILE, markdown("Owns orders and invoices.", "Go"));

    const snapshots = await loadDiffSnapshots(join(root, "docs"));
    expect(snapshots.base.label).toBe("index");
    expect(snapshots.head.label).toBe("working tree");
    expect(serviceTechnology(snapshots.base.payload)).toBe("Go");
    expect(snapshots.acceptanceBase).toBeUndefined();

    const diff = diffWorkspaces(snapshots.base.payload, snapshots.head.payload);
    expect(diff.elements).toMatchObject([
      { id: "service", status: "unchanged", proseChanged: true },
    ]);
  });

  test("compares the index with HEAD when staged, ignoring the working tree", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const head = git(root, "rev-parse", "HEAD").trim();
    write(root, FILE, markdown("Owns orders.", "Go"));
    git(root, "add", FILE);
    write(root, FILE, markdown("Unstaged prose.", "Rust"));

    const snapshots = await loadDiffSnapshots(root, { staged: true });
    expect(snapshots.base.label).toBe(head);
    expect(snapshots.head.label).toBe("index");
    expect(snapshots.acceptanceBase).toBe(head);
    const diff = diffWorkspaces(snapshots.base.payload, snapshots.head.payload);
    expect(diff.elements).toMatchObject([
      {
        id: "service",
        status: "modified",
        proseChanged: false,
        attributes: [{ name: "technology", before: "Node", after: "Go" }],
      },
    ]);
    expect(snapshots.changedFiles).toEqual([FILE]);
  });

  test("compares a reference with the working tree", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const first = git(root, "rev-parse", "HEAD").trim();
    write(root, FILE, markdown("Owns orders.", "Go"));
    commit(root, "switch to go");
    write(root, FILE, markdown("Owns orders.", "Rust"));

    const snapshots = await loadDiffSnapshots(root, { reference: first });
    expect(snapshots.base.label).toBe(first);
    expect(serviceTechnology(snapshots.base.payload)).toBe("Node");
    expect(serviceTechnology(snapshots.head.payload)).toBe("Rust");
  });

  test("compares two commits and the merge base of a symmetric range", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const main = git(root, "rev-parse", "--abbrev-ref", "HEAD").trim();
    const forkPoint = git(root, "rev-parse", "HEAD").trim();
    git(root, "checkout", "-qb", "feature");
    write(root, FILE, markdown("Owns orders.", "Go"));
    const feature = commit(root, "feature change");
    git(root, "checkout", "-q", main);
    write(root, "docs/01-introduction.arc42.md", "# Introduction and Goals\n\nSells books.\n");
    commit(root, "unrelated main change");

    const twoDot = await loadDiffSnapshots(root, { reference: `${main}..feature` });
    expect(twoDot.head.label).toBe(feature);
    const twoDotDiff = diffWorkspaces(twoDot.base.payload, twoDot.head.payload);
    expect(twoDotDiff.proseSections).toMatchObject([{ status: "removed" }]);

    const threeDot = await loadDiffSnapshots(root, { reference: `${main}...feature` });
    expect(threeDot.baseCommit).toBe(forkPoint);
    const threeDotDiff = diffWorkspaces(threeDot.base.payload, threeDot.head.payload);
    expect(threeDotDiff.proseSections).toEqual([]);
    expect(threeDotDiff.elements).toMatchObject([{ id: "service", status: "modified" }]);
  });
});

describe("loadDiffSnapshots — single commit", () => {
  test("compares a commit with its first parent", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const first = git(root, "rev-parse", "HEAD").trim();
    write(root, FILE, markdown("Owns orders.", "Go"));
    const second = commit(root, "switch to go");
    write(root, FILE, markdown("Owns orders.", "Rust"));
    commit(root, "switch to rust");

    const snapshots = await loadDiffSnapshots(root, { commit: second });
    expect(snapshots.base.label).toBe(first);
    expect(snapshots.head.label).toBe(second);
    expect(serviceTechnology(snapshots.base.payload)).toBe("Node");
    expect(serviceTechnology(snapshots.head.payload)).toBe("Go");
    expect(snapshots.changedFiles).toEqual([FILE]);
  });

  test("compares a root commit with the empty tree", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const snapshots = await loadDiffSnapshots(root, { commit: "HEAD" });
    expect(snapshots.base.label).toBe("empty");
    expect(snapshots.baseCommit).toBe(EMPTY_TREE);
    expect(snapshots.acceptanceBase).toBeUndefined();
    expect(snapshots.base.payload.documents).toEqual([]);
    expect(diffWorkspaces(snapshots.base.payload, snapshots.head.payload).elements).toMatchObject([
      { id: "service", status: "added" },
    ]);
  });

  test("refuses the boundary commit of a shallow clone", async () => {
    const origin = repository({ [FILE]: markdown("Owns orders.") });
    write(origin, FILE, markdown("Owns orders.", "Go"));
    commit(origin, "switch to go");
    const clone = mkdtempSync(join(tmpdir(), "arc42-diff-snapshots-shallow-"));
    createdDirs.push(clone);
    execFileSync("git", ["clone", "-q", "--depth", "1", `file://${origin}`, clone]);
    await expect(loadDiffSnapshots(clone, { commit: "HEAD" })).rejects.toThrow(
      /not available in this shallow clone/,
    );
  });

  test("reads architecture documents larger than a mebibyte", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const longProse = `${"The service owns orders. ".repeat(40)}\n\n`.repeat(1500);
    write(root, FILE, markdown(longProse));
    const large = commit(root, "long prose");
    const snapshots = await loadDiffSnapshots(root, { commit: large });
    expect(snapshots.changedFiles).toEqual([FILE]);
    expect(diffWorkspaces(snapshots.base.payload, snapshots.head.payload).elements).toMatchObject([
      { id: "service", status: "unchanged", proseChanged: true },
    ]);
  });

  test("reports changed files with unusual names verbatim", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    const names = ["src/with space.ts", 'src/quote".ts', "src/ä.ts"];
    for (const name of names) write(root, name, "export {};\n");
    const added = commit(root, "unusual names");
    const snapshots = await loadDiffSnapshots(root, { commit: added });
    expect([...snapshots.changedFiles].sort()).toEqual([...names].sort());
  });

  test("rejects a commit combined with a reference", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    await expect(loadDiffSnapshots(root, { commit: "HEAD", reference: "HEAD" })).rejects.toThrow(
      /single commit cannot be combined/,
    );
  });
});

describe("loadDiffSnapshots — workspace content", () => {
  test("parses AsciiDoc on both sides with rendered prose", async () => {
    const adoc = "docs/05-building-blocks.arc42.adoc";
    const root = repository({ [adoc]: asciidoc("Owns orders.") });
    write(root, adoc, asciidoc("Owns orders.", "Go"));

    const snapshots = await loadDiffSnapshots(root);
    expect(snapshots.base.payload.notation).toBe("asciidoc");
    expect(serviceTechnology(snapshots.base.payload)).toBe("Node");
    // The prose renderer stores a run's HTML on the run's first prose node.
    const renderedHtml = snapshots.base.payload.documents[0]?.nodes
      .map((node) => (node.kind === "prose" ? (node.renderedHtml ?? "") : ""))
      .join("");
    expect(renderedHtml).toContain("Owns orders.");
    expect(diffWorkspaces(snapshots.base.payload, snapshots.head.payload).elements).toMatchObject([
      { id: "service", status: "modified", proseChanged: false },
    ]);
  });

  test("limits documents to the workspace directory and uses repository-relative paths", async () => {
    const root = repository({
      [FILE]: markdown("Owns orders."),
      "other/01-introduction.arc42.md": "# Introduction and Goals\n\nElsewhere.\n",
      "src/service.ts": "export {};\n",
    });
    const snapshots = await loadDiffSnapshots(join(root, "docs"));
    expect(snapshots.head.payload.documents.map((document) => document.filePath)).toEqual([FILE]);
    expect(snapshots.head.knownPaths).toContain("src/service.ts");
    expect(snapshots.root).toBe(git(root, "rev-parse", "--show-toplevel").trim());
  });

  test("treats a document deleted from the working tree as removed", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    unlinkSync(join(root, FILE));

    const snapshots = await loadDiffSnapshots(root);
    expect(snapshots.head.payload.documents).toEqual([]);
    expect(diffWorkspaces(snapshots.base.payload, snapshots.head.payload).elements).toMatchObject([
      { id: "service", status: "removed", proseChanged: true },
    ]);
  });
});

describe("loadDiffSnapshots — failures are raised", () => {
  test("outside a Git repository", async () => {
    const dir = mkdtempSync(join(tmpdir(), "arc42-not-git-"));
    createdDirs.push(dir);
    await expect(loadDiffSnapshots(dir)).rejects.toThrow(/Git command failed/);
  });

  test("for an unknown reference", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    await expect(loadDiffSnapshots(root, { reference: "does-not-exist" })).rejects.toThrow(
      /Git command failed: git rev-parse --verify does-not-exist\^\{commit\}/,
    );
  });

  test("for a range combined with staged", async () => {
    const root = repository({ [FILE]: markdown("Owns orders.") });
    await expect(
      loadDiffSnapshots(root, { reference: "HEAD..HEAD", staged: true }),
    ).rejects.toThrow(/cannot be combined with --staged/);
  });

  test("for a mixed-notation snapshot", async () => {
    const root = repository({
      [FILE]: markdown("Owns orders."),
      "docs/01-introduction.arc42.adoc": "= Introduction and Goals\n",
    });
    await expect(loadDiffSnapshots(root)).rejects.toThrow(/Mixed notation workspace/);
  });
});
