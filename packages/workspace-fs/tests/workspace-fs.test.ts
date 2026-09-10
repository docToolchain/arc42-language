import { describe, expect, test, afterEach } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  discoverFiles,
  gitLsFiles,
  loadWorkspace,
  pathEvidence,
  readWorkspaceDocuments,
} from "../src/index.ts";

// ---------------------------------------------------------------------------
// Git repo helper (mirrors the pattern in git-diff.test.ts)
// ---------------------------------------------------------------------------

const createdDirs: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function gitRepository(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-ws-git-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 test");
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  if (Object.keys(files).length > 0) {
    git(root, "add", ".");
    git(root, "commit", "-qm", "initial");
  }
  return root;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("filesystem workspace adapter", () => {
  test("discovers recursively and preserves sorted document order", async () => {
    const root = await mkdtemp(join(tmpdir(), "arc42-workspace-fs-"));
    try {
      await mkdir(join(root, "nested"));
      await writeFile(join(root, "z.arc42.md"), "# Z\n");
      await writeFile(join(root, "nested", "a.arc42.md"), "# A\n");
      expect(await discoverFiles(root)).toEqual([
        join(root, "nested", "a.arc42.md"),
        join(root, "z.arc42.md"),
      ]);
      expect((await readWorkspaceDocuments(root)).map((doc) => doc.filePath)).toEqual(
        await discoverFiles(root),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // This test creates a plain temp directory (not a git repo).
  // pathEvidence() and loadWorkspace() will fall back to the filesystem walker.
  test("supplies path evidence and resolves interface relationships in the payload", async () => {
    const root = await mkdtemp(join(tmpdir(), "arc42-workspace-fs-"));
    try {
      await writeFile(
        join(root, "architecture.arc42.md"),
        "# Architecture\n\n:::building-block\nid: provider\ntitle: Provider\npath: src\n:::\n\n:::building-block\nid: consumer\ntitle: Consumer\nrequires: if-service\n:::\n\n:::interface\nid: if-service\ntitle: Service\nprovider: provider\n:::\n",
      );
      await mkdir(join(root, "src"));
      // pathEvidence uses filesystem fallback (no .git in temp dir)
      const evidence = await pathEvidence(root);
      expect(evidence.knownPaths).toContain("src");
      expect(evidence.root).toBe(root);
      const payload = await loadWorkspace(root);
      expect(payload.elements.map((element) => element.id)).toEqual([
        "consumer",
        "provider",
        "if-service",
      ]);
      expect(payload.edges).toEqual(
        expect.arrayContaining([
          { from: "provider", to: "if-service", relation: "provides" },
          { from: "consumer", to: "if-service", relation: "requires" },
        ]),
      );
      // coverage populated via filesystem fallback — should have trackedFiles count
      expect(payload.coverage).toBeDefined();
      expect(typeof payload.coverage?.totalFiles).toBe("number");
      // The bb-core element has path: src — so src should appear as covered
      expect(payload.coverage?.covered.some((c) => c.path.startsWith("src"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Git-aware path discovery
// ---------------------------------------------------------------------------

describe("git-aware path discovery", () => {
  test("gitLsFiles returns tracked file paths relative to repo root", () => {
    const root = gitRepository({
      "architecture.arc42.md": "# Architecture\n",
      "src/main.ts": "export {};\n",
    });
    // src/main.ts is not a directory but a file — git ls-files returns files
    const paths = gitLsFiles(root);
    expect(paths).toContain("architecture.arc42.md");
    expect(paths).toContain("src/main.ts");
    // Untracked files should not appear
    writeFileSync(join(root, "untracked.ts"), "");
    const paths2 = gitLsFiles(root);
    expect(paths2).not.toContain("untracked.ts");
  });

  test("gitLsFiles throws when called outside a git repository", () => {
    // mkdtemp creates a plain dir with no .git
    const plain = mkdtempSync(join(tmpdir(), "arc42-no-git-"));
    createdDirs.push(plain);
    expect(() => gitLsFiles(plain)).toThrow();
  });

  test("pathEvidence uses git ls-files in a git repo", () => {
    const root = gitRepository({
      "architecture.arc42.md": "# Architecture\n",
      "src/main.ts": "export {};\n",
    });
    // Run async in a sync-friendly way by awaiting inline (test runner supports async)
    return pathEvidence(root).then((evidence) => {
      expect(evidence.root).toBe(root);
      // git ls-files returns files, not dirs; knownPaths contains the tracked file paths
      expect(evidence.knownPaths).toContain("architecture.arc42.md");
      expect(evidence.knownPaths).toContain("src/main.ts");
      // Should NOT include the 35k+ node_modules-style noise
      expect(evidence.knownPaths.length).toBeLessThan(100);
    });
  });

  test("loadWorkspace in a git repo populates coverage from git ls-files", async () => {
    const root = gitRepository({
      "05-building-blocks.arc42.md":
        "# Building Blocks\n\n:::building-block\nid: bb-core\ntitle: Core\npath: src/main.ts\n:::\n",
      "src/main.ts": "export {};\n",
      "docs/readme.md": "# Docs\n",
    });
    const payload = await loadWorkspace(root);
    expect(payload.coverage).toBeDefined();
    // bb-core claims src/main.ts — domain parent is src/
    // src is in the domain; docs is also in domain (parent of src/main.ts is src, but docs has no element → uncovered)
    expect(payload.coverage?.totalFiles).toBeGreaterThan(0);
    // src/main.ts is covered by bb-core
    expect(payload.coverage?.coveredFileCount).toBeGreaterThan(0);
    // No node_modules noise (git-tracked only)
    expect(payload.coverage?.covered.some((c) => c.path.startsWith("node_modules"))).toBe(false);
  });
});
