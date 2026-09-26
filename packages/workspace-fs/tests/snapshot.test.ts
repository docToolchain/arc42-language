// Black-box tests: real Git repositories, public package API only.
import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { readArchitectureBlob, readCommitFiles } from "../src/index.ts";

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

function blobId(root: string, commit: string, path: string): string {
  return git(root, "rev-parse", `${commit}:${path}`).trim();
}

/** docs/ holds the workspace; other/ another workspace; src/ code. */
function repository() {
  const root = mkdtempSync(join(tmpdir(), "arc42-snapshot-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Ada Architect");
  write(root, "docs/01-introduction.arc42.md", "# Introduction and Goals\n\nFirst.\n");
  write(root, "docs/05-building-blocks.arc42.md", "# Building Block View\n\nBlocks.\n");
  write(root, "docs/README.md", "Not architecture.\n");
  write(root, "other/01-introduction.arc42.md", "# Introduction and Goals\n\nOther.\n");
  write(root, "src/service.ts", "export const secret = 1;\n");
  const first = commit(root, "first");
  write(root, "docs/01-introduction.arc42.md", "# Introduction and Goals\n\nSecond.\n");
  const second = commit(root, "second");
  return { root, docs: join(root, "docs"), first, second };
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("readCommitFiles", () => {
  test("lists every tracked path and the blob ids of the workspace's architecture files", () => {
    const { root, docs, first } = repository();
    const { files, paths } = readCommitFiles(docs, first);
    expect(paths.sort()).toEqual([
      "docs/01-introduction.arc42.md",
      "docs/05-building-blocks.arc42.md",
      "docs/README.md",
      "other/01-introduction.arc42.md",
      "src/service.ts",
    ]);
    expect(files).toEqual({
      "docs/01-introduction.arc42.md": blobId(root, first, "docs/01-introduction.arc42.md"),
      "docs/05-building-blocks.arc42.md": blobId(root, first, "docs/05-building-blocks.arc42.md"),
    });
  });

  test("gives an unchanged file the same blob id in every commit", () => {
    const { docs, first, second } = repository();
    const before = readCommitFiles(docs, first).files;
    const after = readCommitFiles(docs, second).files;
    expect(after["docs/05-building-blocks.arc42.md"]).toBe(
      before["docs/05-building-blocks.arc42.md"],
    );
    expect(after["docs/01-introduction.arc42.md"]).not.toBe(
      before["docs/01-introduction.arc42.md"],
    );
  });

  test("takes full commit ids only", () => {
    const { docs } = repository();
    expect(() => readCommitFiles(docs, "HEAD")).toThrow(/Not a full commit id: HEAD/);
    expect(() => readCommitFiles(docs, "0".repeat(40))).toThrow(/Git command failed/);
  });
});

describe("readArchitectureBlob", () => {
  test("reads an architecture file of the history by its blob id", () => {
    const { root, docs, first, second } = repository();
    const id = blobId(root, first, "docs/01-introduction.arc42.md");
    expect(readArchitectureBlob(docs, [second, first], id)).toBe(
      "# Introduction and Goals\n\nFirst.\n",
    );
  });

  test("refuses code, other files and other workspaces", () => {
    const { root, docs, first, second } = repository();
    for (const path of ["src/service.ts", "docs/README.md", "other/01-introduction.arc42.md"]) {
      const id = blobId(root, first, path);
      expect(() => readArchitectureBlob(docs, [second, first], id)).toThrow(
        `Not an architecture file of this history: ${id}`,
      );
    }
  });

  test("refuses an architecture file of a commit outside the given history", () => {
    const { root, docs, first, second } = repository();
    const id = blobId(root, first, "docs/01-introduction.arc42.md");
    expect(() => readArchitectureBlob(docs, [second], id)).toThrow(
      /Not an architecture file of this history/,
    );
  });
});
