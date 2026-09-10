import { describe, expect, test } from "vite-plus/test";
import { computeCoverage } from "../src/coverage.ts";
import type { Element } from "../src/model/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bb(id: string, path?: string): Element {
  return {
    kind: "building-block",
    id,
    title: id,
    implements: [],
    requires: [],
    loc: { file: "05-building-blocks.arc42.md", line: 1 },
    ...(path !== undefined ? { path } : {}),
  } as Element;
}

function iface(id: string, path?: string): Element {
  return {
    kind: "interface",
    id,
    title: id,
    provider: "some-provider",
    loc: { file: "05-building-blocks.arc42.md", line: 1 },
    ...(path !== undefined ? { path } : {}),
  } as Element;
}

function actor(id: string): Element {
  return {
    kind: "actor",
    id,
    title: id,
    type: "system",
    requires: [],
    loc: { file: "03-context.arc42.md", line: 1 },
  } as Element;
}

// ---------------------------------------------------------------------------
// Model:
//
// computeCoverage(elements, trackedPaths)
//   trackedPaths = full git ls-files output (all leaf file paths)
//
// Coverage domain = for each unique parent directory that contains at least
// one element path, collect all immediate children (files and first-level
// subdirs) from trackedPaths that live under that parent.
//
// Display entries: only top-level domain entries — sub-paths are suppressed
// when a parent directory claim already covers them (unless they also have
// an overlap annotation).
//
// Metric = file-level: count actual leaf files from trackedPaths that are
// covered/uncovered, not domain entries. This gives a meaningful percentage.
// ---------------------------------------------------------------------------

describe("computeCoverage — basic domain construction", () => {
  test("empty trackedPaths → empty result", () => {
    const result = computeCoverage([bb("bb-core", "packages/core")], []);
    expect(result.covered).toEqual([]);
    expect(result.uncovered).toEqual([]);
    expect(result.totalFiles).toBe(0);
    expect(result.coveredFileCount).toBe(0);
  });

  test("no elements with paths → empty domain", () => {
    const result = computeCoverage(
      [bb("bb-no-path"), actor("ext")],
      ["packages/core/index.ts", "packages/cli/index.ts"],
    );
    expect(result.covered).toEqual([]);
    expect(result.uncovered).toEqual([]);
    expect(result.totalFiles).toBe(0);
    expect(result.coveredFileCount).toBe(0);
  });
});

describe("computeCoverage — display collapsing", () => {
  test("sub-paths suppressed when parent directory is covered", () => {
    // bb-web claims packages/web (directory)
    // all packages/web/**/* files are covered by that claim
    // → display should only show packages/web, not each file separately
    const result = computeCoverage(
      [bb("bb-web", "packages/web")],
      [
        "packages/web/src/App.tsx",
        "packages/web/src/styles.css",
        "packages/web/src/types.ts",
        "packages/mermaid/src/index.ts",
      ],
    );
    // Only packages/web appears in covered display (not the individual files)
    expect(result.covered.map((c) => c.path)).toEqual(["packages/web"]);
    expect(result.uncovered).toEqual(["packages/mermaid"]);
  });

  test("overlap entries are shown even when parent is covered", () => {
    // bb-web covers packages/web; if-web-types also claims packages/web/src/types.ts specifically
    // With new semantics: bb (directory) + interface (file inside it) is NOT an overlap —
    // it's the expected pattern. So types.ts is NOT shown (parent bb-web covers it).
    const result = computeCoverage(
      [bb("bb-web", "packages/web"), iface("if-web-types", "packages/web/src/types.ts")],
      ["packages/web/src/App.tsx", "packages/web/src/types.ts", "packages/mermaid/src/index.ts"],
    );
    const displayPaths = result.covered.map((c) => c.path);
    expect(displayPaths).toContain("packages/web");
    // App.tsx and types.ts are NOT shown — both covered by parent bb-web, no same-kind overlap
    expect(displayPaths).not.toContain("packages/web/src/App.tsx");
    expect(displayPaths).not.toContain("packages/web/src/types.ts");
  });

  test("two building-blocks claiming same directory → overlap shown", () => {
    // Two bbs with identical path = competing ownership = genuine overlap
    const result = computeCoverage(
      [bb("bb-core", "packages/core"), bb("bb-core-alt", "packages/core")],
      ["packages/core/index.ts", "packages/mermaid/index.ts"],
    );
    const coreEntry = result.covered.find((c) => c.path === "packages/core");
    expect(coreEntry?.overlapping).toBe(true);
    expect(coreEntry?.claimedBy.map((c) => c.id)).toContain("bb-core");
    expect(coreEntry?.claimedBy.map((c) => c.id)).toContain("bb-core-alt");
    // It should be shown in the display (overlap entries always shown)
    expect(result.covered.map((c) => c.path)).toContain("packages/core");
  });

  test("uncovered siblings shown at the correct level", () => {
    // bb-core covers packages/core; packages/mermaid is uncovered
    // uncovered display should show packages/mermaid (not its files individually)
    const result = computeCoverage(
      [bb("bb-core", "packages/core")],
      ["packages/core/index.ts", "packages/mermaid/src/index.ts", "packages/mermaid/src/parser.ts"],
    );
    expect(result.covered.map((c) => c.path)).toEqual(["packages/core"]);
    // packages/mermaid is uncovered as a unit, not each file separately
    expect(result.uncovered).toEqual(["packages/mermaid"]);
  });
});

describe("computeCoverage — file-level metric", () => {
  test("totalFiles counts leaf files in domain scope only", () => {
    // bb-core covers packages/core → 3 files under it
    // packages/mermaid → 2 files uncovered
    // scripts/* → out of domain (no element references scripts/)
    const result = computeCoverage(
      [bb("bb-core", "packages/core")],
      [
        "packages/core/index.ts",
        "packages/core/src/builder.ts",
        "packages/core/src/parser.ts",
        "packages/mermaid/src/index.ts",
        "packages/mermaid/src/parser.ts",
        "scripts/build.ts", // out of domain
      ],
    );
    // Total files in domain scope = 5 (packages/core/* + packages/mermaid/*)
    expect(result.totalFiles).toBe(5);
    expect(result.coveredFileCount).toBe(3);
    expect(result.uncoveredFileCount).toBe(2);
  });

  test("directory claim covers ALL files under it recursively", () => {
    const result = computeCoverage(
      [bb("bb-web", "packages/web")],
      [
        "packages/web/src/App.tsx",
        "packages/web/src/nested/deep/file.ts",
        "packages/web/index.html",
        "packages/mermaid/index.ts",
      ],
    );
    expect(result.totalFiles).toBe(4);
    expect(result.coveredFileCount).toBe(3); // 3 files under packages/web
    expect(result.uncoveredFileCount).toBe(1); // packages/mermaid/index.ts
  });

  test("file claim covers exactly one file", () => {
    const result = computeCoverage(
      [iface("if-api", "packages/core/src/index.ts")],
      ["packages/core/src/index.ts", "packages/core/src/builder.ts"],
    );
    expect(result.totalFiles).toBe(2);
    expect(result.coveredFileCount).toBe(1);
    expect(result.uncoveredFileCount).toBe(1);
  });

  test("coveredFileCount + uncoveredFileCount = totalFiles", () => {
    const result = computeCoverage(
      [bb("bb-core", "packages/core"), bb("bb-cli", "packages/cli")],
      [
        "packages/core/a.ts",
        "packages/core/b.ts",
        "packages/cli/a.ts",
        "packages/mermaid/a.ts", // uncovered
        "packages/web/a.ts", // uncovered
      ],
    );
    expect(result.coveredFileCount + result.uncoveredFileCount).toBe(result.totalFiles);
    expect(result.totalFiles).toBe(5);
    expect(result.coveredFileCount).toBe(3);
    expect(result.uncoveredFileCount).toBe(2);
  });
});

describe("computeCoverage — overlap detection", () => {
  test("bb directory + interface file inside it → NOT overlapping (expected pattern)", () => {
    // This is the canonical pattern: bb owns the directory, interface points to a specific file
    const result = computeCoverage(
      [bb("bb-core", "packages/core"), iface("if-index", "packages/core/src/index.ts")],
      ["packages/core/src/index.ts", "packages/core/src/builder.ts"],
    );
    // packages/core/src/index.ts is NOT in the display (bb-core covers it, no same-kind overlap)
    const indexEntry = result.covered.find((c) => c.path === "packages/core/src/index.ts");
    expect(indexEntry).toBeUndefined();
    // packages/core is shown and covers everything
    expect(result.covered.find((c) => c.path === "packages/core")).toBeDefined();
    // No overlapping entries
    for (const entry of result.covered) {
      expect(entry.overlapping).toBe(false);
    }
  });

  test("two building-blocks with identical path → overlapping = true", () => {
    const result = computeCoverage(
      [bb("bb-a", "packages/core"), bb("bb-b", "packages/core")],
      ["packages/core/index.ts"],
    );
    const entry = result.covered.find((c) => c.path === "packages/core");
    expect(entry?.overlapping).toBe(true);
    expect(entry?.claimedBy.map((c) => c.id).sort()).toEqual(["bb-a", "bb-b"]);
  });

  test("two interfaces pointing to the same file → overlapping = true", () => {
    const result = computeCoverage(
      [iface("if-a", "packages/core/src/index.ts"), iface("if-b", "packages/core/src/index.ts")],
      ["packages/core/src/index.ts"],
    );
    const entry = result.covered.find((c) => c.path === "packages/core/src/index.ts");
    expect(entry?.overlapping).toBe(true);
    expect(entry?.claimedBy.map((c) => c.id).sort()).toEqual(["if-a", "if-b"]);
  });

  test("single directory claim only → overlapping = false for all entries", () => {
    const result = computeCoverage(
      [bb("bb-core", "packages/core")],
      ["packages/core/src/index.ts", "packages/core/src/builder.ts"],
    );
    for (const entry of result.covered) {
      expect(entry.overlapping).toBe(false);
    }
  });
});

describe("computeCoverage — edge cases", () => {
  test("empty element path ignored", () => {
    const result = computeCoverage([bb("bb-empty", "")], ["packages/core/index.ts"]);
    expect(result.covered).toEqual([]);
    expect(result.uncovered).toEqual([]);
    expect(result.totalFiles).toBe(0);
  });

  test("non-bb/interface elements ignored", () => {
    const result = computeCoverage(
      [actor("ext"), bb("bb-core", "packages/core")],
      ["packages/core/index.ts", "packages/mermaid/index.ts"],
    );
    expect(result.covered.map((c) => c.path)).toContain("packages/core");
    expect(result.uncovered).toContain("packages/mermaid");
  });

  test("duplicate paths in trackedPaths are deduplicated for file count", () => {
    const result = computeCoverage(
      [bb("bb-core", "packages/core")],
      [
        "packages/core/index.ts",
        "packages/core/index.ts", // duplicate
        "packages/mermaid/index.ts",
      ],
    );
    expect(result.totalFiles).toBe(2); // deduplicated
    expect(result.coveredFileCount).toBe(1);
  });
});
