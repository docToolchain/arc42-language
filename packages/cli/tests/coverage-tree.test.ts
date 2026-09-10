import { describe, expect, test } from "vite-plus/test";
import { formatCoverageTree } from "../src/coverage-tree.ts";
import type { CoverageResult } from "@arc42/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function result(
  covered: Array<{
    path: string;
    claimedBy: Array<{ id: string; path: string; kind: "building-block" | "interface" }>;
    overlapping: boolean;
  }>,
  uncovered: string[],
): CoverageResult {
  const allFiles = covered.length + uncovered.length; // rough proxy
  return {
    covered,
    uncovered,
    totalFiles: allFiles,
    coveredFileCount: covered.length,
    uncoveredFileCount: uncovered.length,
  };
}

function c(path: string, ...ids: string[]) {
  return {
    path,
    claimedBy: ids.map((id) => ({ id, path, kind: "building-block" as const })),
    overlapping: false,
  };
}

function cOverlap(path: string, ...ids: string[]) {
  return {
    path,
    claimedBy: ids.map((id) => ({ id, path, kind: "building-block" as const })),
    overlapping: true,
  };
}

// Strip ANSI colour codes for snapshot assertions
function strip(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("formatCoverageTree", () => {
  test("empty result produces only summary line", () => {
    const out = strip(
      formatCoverageTree({
        covered: [],
        uncovered: [],
        totalFiles: 0,
        coveredFileCount: 0,
        uncoveredFileCount: 0,
      }),
    );
    expect(out).toContain("0 of 0");
  });

  test("flat covered entries show check mark and claimants", () => {
    const out = strip(formatCoverageTree(result([c("packages/core", "bb-core")], [])));
    expect(out).toContain("✓");
    expect(out).toContain("packages");
    expect(out).toContain("core");
    expect(out).toContain("bb-core");
  });

  test("uncovered entries show ✗ and no claimants", () => {
    const out = strip(formatCoverageTree(result([], ["packages/mermaid"])));
    expect(out).toContain("✗");
    expect(out).toContain("mermaid");
    // No claimant listed
    expect(out).not.toContain("→");
  });

  test("siblings at same level rendered as tree branches", () => {
    const out = strip(
      formatCoverageTree(
        result([c("packages/core", "bb-core"), c("packages/cli", "bb-cli")], ["packages/mermaid"]),
      ),
    );
    // All three are children of packages/
    expect(out).toContain("core");
    expect(out).toContain("cli");
    expect(out).toContain("mermaid");
    // Tree connectors present
    expect(out).toMatch(/[├└]/);
  });

  test("overlap entries annotated with [shared]", () => {
    const out = strip(
      formatCoverageTree(
        result([cOverlap("packages/core/src/index.ts", "bb-core", "if-core")], []),
      ),
    );
    expect(out).toContain("[shared]");
    expect(out).toContain("bb-core");
    expect(out).toContain("if-core");
  });

  test("entries grouped under common parent", () => {
    const out = strip(
      formatCoverageTree(
        result(
          [
            c("packages/core", "bb-core"),
            cOverlap("packages/core/src/index.ts", "bb-core", "if-core"),
          ],
          [],
        ),
      ),
    );
    const lines = out.split("\n").filter(Boolean);
    // "packages" should appear once as a group header
    const packagesLines = lines.filter((l) => l.includes("packages"));
    expect(packagesLines.length).toBeGreaterThanOrEqual(1);
    // core and index.ts both under packages
    expect(out).toContain("core");
    expect(out).toContain("index.ts");
  });

  test("summary line shows file-level metric", () => {
    const out = strip(
      formatCoverageTree({
        covered: [c("packages/core", "bb-core")],
        uncovered: ["packages/mermaid"],
        totalFiles: 10,
        coveredFileCount: 7,
        uncoveredFileCount: 3,
      }),
    );
    expect(out).toContain("7 of 10");
  });

  test("uncovered entries have red ANSI colour applied", () => {
    const out = formatCoverageTree(result([], ["packages/mermaid"]));
    // Red = \x1b[31m
    expect(out).toContain("\x1b[31m");
  });

  test("last child uses └── connector, others use ├──", () => {
    const out = strip(
      formatCoverageTree(
        result([c("packages/core", "bb-core"), c("packages/cli", "bb-cli")], ["packages/mermaid"]),
      ),
    );
    expect(out).toContain("├──");
    expect(out).toContain("└──");
  });
});
