// Black-box tests: real Git repositories, public package API only.
import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { listArchitectureHistory, loadCommitChange } from "../src/index.ts";

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

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-history-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Ada Architect");
  return root;
}

const FILE = "docs/05-building-blocks.arc42.md";

function markdown(technology: string, prose = "Owns orders."): string {
  return `# Building Block View\n\n## Service\n\n${prose}\n\n\`\`\`arc42\n:::building-block\nid: service\ntitle: Service\ntechnology: ${technology}\n:::\n\`\`\`\n`;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("listArchitectureHistory", () => {
  test("lists commits touching architecture documents, newest first", () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    const first = commit(root, "add service");
    write(root, "src/service.ts", "export {};\n");
    commit(root, "code only");
    write(root, FILE, markdown("Go", "Owns orders, now in Go."));
    const third = commit(root, "switch to go");

    const history = listArchitectureHistory(join(root, "docs"));
    expect(history.commits).toMatchObject([
      { commit: third, parent: expect.any(String), subject: "switch to go" },
      { commit: first, parent: null, subject: "add service", author: "Ada Architect" },
    ]);
    expect(Date.parse(history.commits[0]!.date)).not.toBeNaN();
  });

  test("follows the first parent through merges", () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    commit(root, "add service");
    const main = git(root, "rev-parse", "--abbrev-ref", "HEAD").trim();
    git(root, "checkout", "-qb", "feature");
    write(root, FILE, markdown("Go", "Owns orders, now in Go."));
    commit(root, "feature work");
    git(root, "checkout", "-q", main);
    git(root, "merge", "-q", "--no-ff", "-m", "merge feature", "feature");

    const subjects = listArchitectureHistory(root).commits.map((commit) => commit.subject);
    expect(subjects).toEqual(["merge feature", "add service"]);
  });

  test("only considers documents inside the workspace directory", () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    commit(root, "docs");
    write(root, "other/01-introduction.arc42.md", "# Introduction and Goals\n\nElsewhere.\n");
    commit(root, "other workspace");

    const subjects = listArchitectureHistory(join(root, "docs")).commits.map((c) => c.subject);
    expect(subjects).toEqual(["docs"]);
  });

  test("leads with a working-tree pearl when documents have uncommitted changes", () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    const head = commit(root, "add service");
    expect(listArchitectureHistory(root).commits[0]!.commit).toBe(head);

    write(root, FILE, markdown("Go"));
    expect(listArchitectureHistory(root).commits[0]).toMatchObject({
      commit: null,
      parent: head,
      subject: "Uncommitted changes",
      body: "",
    });
  });

  test("keeps the raw commit message body", () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "add service", "-m", "Because **performance** matters.");
    expect(listArchitectureHistory(root).commits[0]!.body).toBe("Because **performance** matters.");
  });

  test("fails outside a Git repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "arc42-not-git-"));
    createdDirs.push(dir);
    expect(() => listArchitectureHistory(dir)).toThrow(/Git command failed/);
  });
});

describe("loadCommitChange", () => {
  test("computes the change of each commit against its first parent", async () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    commit(root, "add service");
    write(root, FILE, markdown("Go", "Owns orders, now in Go."));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "switch to go", "-m", "Because **performance** matters.");

    const history = listArchitectureHistory(root);
    const latest = await loadCommitChange(root, history.commits[0]!);
    const root_ = await loadCommitChange(root, history.commits[1]!);
    expect(latest).toMatchObject({
      commit: history.commits[0]!.commit,
      semantic: true,
      added: 0,
      modified: 1,
      removed: 0,
      diff: { head: { label: history.commits[0]!.commit } },
    });
    // The element and the heading-only "Building Block View" section are both new.
    expect(root_).toMatchObject({ semantic: true, added: 2 });
    expect(root_.diff!.base.label).toBe("empty");
  });

  test("marks reformatting-only commits as not semantic", async () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    commit(root, "add service");
    write(root, FILE, markdown("Node", "Owns\norders."));
    commit(root, "reflow");

    const history = listArchitectureHistory(root);
    const entry = await loadCommitChange(root, history.commits[0]!);
    expect(entry).toMatchObject({ semantic: false, added: 0, modified: 0, removed: 0 });
    expect(entry.diff!.view.documents).toEqual([]);
  });

  test("compares the working tree with HEAD, staged or not", async () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    commit(root, "add service");
    write(root, FILE, markdown("Go", "Now in Go."));
    git(root, "add", "-A");

    const history = listArchitectureHistory(root);
    const entry = await loadCommitChange(root, history.commits[0]!);
    expect(entry).toMatchObject({ commit: null, semantic: true, modified: 1 });
    expect(entry.diff!.head.label).toBe("working tree");
  });

  test("reports a commit that cannot be diffed on its entry only", async () => {
    const root = repository();
    write(root, FILE, markdown("Node"));
    commit(root, "add service");
    write(
      root,
      FILE,
      `${markdown("Node")}\n## Copy\n\nCopy.\n\n\`\`\`arc42\n:::building-block\nid: service\ntitle: Copy\n:::\n\`\`\`\n`,
    );
    commit(root, "duplicate id");

    const history = listArchitectureHistory(root);
    const broken = await loadCommitChange(root, history.commits[0]!);
    const healthy = await loadCommitChange(root, history.commits[1]!);
    expect(broken).toMatchObject({ semantic: false });
    expect(broken.error).toContain("Duplicate id 'service'");
    expect(broken.diff).toBeUndefined();
    expect(healthy.error).toBeUndefined();
  });

  test("reports the boundary commit of a shallow clone instead of comparing with nothing", async () => {
    const origin = repository();
    write(origin, FILE, markdown("Node"));
    commit(origin, "first");
    write(origin, FILE, markdown("Go", "Now in Go."));
    commit(origin, "second");
    const clone = mkdtempSync(join(tmpdir(), "arc42-history-shallow-"));
    createdDirs.push(clone);
    execFileSync("git", ["clone", "-q", "--depth", "1", `file://${origin}`, clone]);

    const history = listArchitectureHistory(clone);
    expect(history.commits.map((commit) => commit.subject)).toEqual(["second"]);
    const entry = await loadCommitChange(clone, history.commits[0]!);
    expect(entry.error).toContain("shallow clone");
  });
});
