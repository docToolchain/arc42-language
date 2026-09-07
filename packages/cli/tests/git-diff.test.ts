import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectGitDiff, parseDiffPathHeader } from "../src/git-diff.ts";

const createdDirs: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function repository(): string {
  const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-git-diff-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 test");
  writeFileSync(join(root, "architecture.arc42.md"), "# Architecture\n\nInitial\n");
  git(root, "add", ".");
  git(root, "commit", "-qm", "initial");
  return root;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

describe("Git diff acquisition", () => {
  test("parses quoted Git paths", () => {
    expect(
      parseDiffPathHeader(
        'diff --git "a/architecture docs.arc42.md" "b/architecture docs.arc42.md"',
      ),
    ).toBe("architecture docs.arc42.md");
    expect(parseDiffPathHeader('diff --git "a/quote\\\".md" "b/quote\\\".md"')).toBe('quote".md');
    expect(parseDiffPathHeader('diff --git "a/\\303\\244.md" "b/\\303\\244.md"')).toBe("ä.md");
  });

  test("reads the working tree and compares it with the index by default", () => {
    const root = repository();
    writeFileSync(join(root, "architecture.arc42.md"), "# Architecture\n\nUpdated\n");
    const result = collectGitDiff(root);
    expect(result.currentDocuments.get("architecture.arc42.md")).toContain("Updated");
    expect(result.baseDocuments.get("architecture.arc42.md")).toContain("Initial");
    expect(result.changes[0]?.newRanges.length).toBeGreaterThan(0);
    expect(result.base).toMatch(/^[0-9a-f]{40}$/);
  });

  test("accepts an explicit base reference", () => {
    const root = repository();
    const base = git(root, "rev-parse", "HEAD").trim();
    writeFileSync(join(root, "src.ts"), "export const value = 1;\n");
    git(root, "add", "src.ts");
    expect(collectGitDiff(root, base).changes.some((change) => change.filePath === "src.ts")).toBe(
      true,
    );
    expect(parseDiffPathHeader('diff --git "a/quote\\\".md" "b/quote\\\".md"')).toBe('quote".md');
  });

  test("supports staged comparisons explicitly", () => {
    const root = repository();
    writeFileSync(join(root, "architecture.arc42.md"), "# Architecture\n\nStaged\n");
    git(root, "add", "architecture.arc42.md");
    writeFileSync(join(root, "architecture.arc42.md"), "# Architecture\n\nWorking tree\n");
    const result = collectGitDiff(root, undefined, true);
    expect(result.currentDocuments.get("architecture.arc42.md")).toContain("Staged");
    expect(result.baseDocuments.get("architecture.arc42.md")).toContain("Initial");
  });

  test("rejects a directory that is not a Git repository", () => {
    const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-not-git-"));
    createdDirs.push(root);
    expect(() => collectGitDiff(root)).toThrow(/Git command failed/);
  });
});
