import { describe, expect, test } from "vite-plus/test";
import type { DocumentAst } from "../src/ast.ts";
import { lintArchitectureDiff, type FileChange } from "../src/diff.ts";
import type { Element } from "../src/model/types.ts";

function bb(id: string, path?: string): Element {
  return {
    kind: "building-block",
    id,
    title: id,
    implements: [],
    requires: [],
    loc: { file: "architecture.arc42.md", line: 1 },
    ...(path !== undefined ? { path } : {}),
  } as Element;
}

const change = (
  filePath: string,
  newRanges: [number, number][],
  oldRanges = newRanges,
): FileChange => ({
  filePath,
  oldRanges: oldRanges.map(([start, end]) => ({ start, end })),
  newRanges: newRanges.map(([start, end]) => ({ start, end })),
});

function document(
  content: Array<{
    kind: "heading" | "prose" | "block";
    line: number;
    endLine?: number;
    text?: string;
  }>,
): DocumentAst {
  return {
    filePath: "architecture.arc42.md",
    nodes: content.map((node) =>
      node.kind === "heading"
        ? { kind: "heading", level: 2, text: node.text ?? "Section", line: node.line }
        : node.kind === "prose"
          ? { kind: "prose", text: node.text ?? "Narrative", line: node.line }
          : {
              kind: "block",
              blockType: "building-block",
              attributes: { id: "service", title: "Service", implements: "" },
              startLine: node.line,
              endLine: node.endLine ?? node.line,
              inArc42Fence: true,
            },
    ),
  };
}

describe("architecture diff lint", () => {
  test("reports a block-only change and ignores an unrelated section", () => {
    const ast = document([
      { kind: "heading", line: 1, text: "Service" },
      { kind: "prose", line: 2 },
      { kind: "block", line: 3 },
      { kind: "heading", line: 5, text: "Other" },
      { kind: "prose", line: 6 },
    ]);
    const result = lintArchitectureDiff({
      changes: [change(ast.filePath, [[3, 3]])],
      current: [ast],
    });
    expect(result.consistencyFindings).toHaveLength(1);
    expect(result.consistencyFindings[0]?.kind).toBe("block-without-prose-change");
    expect(result.consistencyFindings[0]?.severity).toBe("warning");
  });

  test("accepts a prose and block change in the same section", () => {
    const ast = document([
      { kind: "heading", line: 1 },
      { kind: "prose", line: 2 },
      { kind: "block", line: 3 },
    ]);
    const result = lintArchitectureDiff({
      changes: [change(ast.filePath, [[2, 3]])],
      current: [ast],
    });
    expect(result.consistencyFindings).toHaveLength(0);
  });

  test("reports prose-only changes", () => {
    const ast = document([
      { kind: "heading", line: 1 },
      { kind: "prose", line: 2 },
      { kind: "block", line: 3 },
    ]);
    const result = lintArchitectureDiff({
      changes: [change(ast.filePath, [[2, 2]])],
      current: [ast],
    });
    expect(result.consistencyFindings[0]?.kind).toBe("prose-without-block-change");
  });

  test("accepts deletion of a block together with its prose", () => {
    const oldAst = document([
      { kind: "heading", line: 1 },
      { kind: "prose", line: 2 },
      { kind: "block", line: 3 },
    ]);
    const result = lintArchitectureDiff({
      changes: [change(oldAst.filePath, [[2, 1]], [[2, 3]])],
      current: [],
      base: [oldAst],
    });
    expect(result.consistencyFindings).toHaveLength(0);
  });

  test("reports deletion of a block when its prose remains", () => {
    const oldAst = document([
      { kind: "heading", line: 1 },
      { kind: "prose", line: 2 },
      { kind: "block", line: 3 },
    ]);
    const currentAst = document([
      { kind: "heading", line: 1 },
      { kind: "prose", line: 2 },
    ]);
    const result = lintArchitectureDiff({
      changes: [change(oldAst.filePath, [[3, 2]], [[3, 3]])],
      current: [currentAst],
      base: [oldAst],
    });
    expect(result.consistencyFindings[0]?.kind).toBe("block-without-prose-change");
  });

  test("reports path impact as a non-blocking hint", () => {
    const ast: DocumentAst = {
      filePath: "architecture.arc42.md",
      nodes: [
        {
          kind: "block",
          blockType: "interface",
          attributes: {
            id: "service-api",
            title: "Service API",
            provider: "service",
            path: "src/service",
          },
          startLine: 1,
          endLine: 1,
          inArc42Fence: true,
        },
      ],
    };
    const result = lintArchitectureDiff({
      changes: [change("src/service/index.ts", [[4, 4]])],
      current: [ast],
    });
    expect(result.pathFindings).toHaveLength(1);
    expect(result.pathFindings[0]?.severity).toBe("hint");
    expect(result.hasBlockingFindings).toBe(false);
    expect(result.affectedRanges).toHaveLength(0);
  });

  test("building-block path changes do not produce path hints", () => {
    const ast: DocumentAst = {
      filePath: "architecture.arc42.md",
      nodes: [
        {
          kind: "block",
          blockType: "building-block",
          attributes: { id: "service", title: "Service", implements: "", path: "src/service" },
          startLine: 1,
          endLine: 1,
          inArc42Fence: true,
        },
      ],
    };
    const result = lintArchitectureDiff({
      changes: [change("src/service/index.ts", [[4, 4]])],
      current: [ast],
    });
    expect(result.pathFindings).toHaveLength(0);
  });

  test("uses path components rather than textual prefixes", () => {
    const ast: DocumentAst = {
      filePath: "architecture.arc42.md",
      nodes: [
        {
          kind: "block",
          blockType: "interface",
          attributes: {
            id: "service-api",
            title: "Service API",
            provider: "service",
            path: "src/service",
          },
          startLine: 1,
          endLine: 1,
          inArc42Fence: true,
        },
      ],
    };
    const result = lintArchitectureDiff({
      changes: [change("src/services.ts", [[4, 4]])],
      current: [ast],
    });
    expect(result.pathFindings).toHaveLength(0);
  });

  test("uses Git tree paths to distinguish files, directories, and unresolved paths", () => {
    const ast: DocumentAst = {
      filePath: "architecture.arc42.md",
      nodes: [
        {
          kind: "block",
          blockType: "interface",
          attributes: { id: "file", title: "File", provider: "bb", path: "src/Makefile" },
          startLine: 1,
          endLine: 1,
          inArc42Fence: true,
        },
        {
          kind: "block",
          blockType: "interface",
          attributes: { id: "dir", title: "Dir", provider: "bb", path: "src/foo.test" },
          startLine: 2,
          endLine: 2,
          inArc42Fence: true,
        },
        {
          kind: "block",
          blockType: "interface",
          attributes: { id: "missing", title: "Missing", provider: "bb", path: "src/missing" },
          startLine: 3,
          endLine: 3,
          inArc42Fence: true,
        },
      ],
    };
    const result = lintArchitectureDiff({
      changes: [
        change("src/Makefile", [[4, 4]]),
        change("src/foo.test/index.ts", [[5, 5]]),
        change("src/missing/file.ts", [[6, 6]]),
      ],
      current: [ast],
      currentKnownPaths: new Set(["src/Makefile", "src/foo.test/index.ts"]),
    });
    expect(result.pathFindings.map((finding) => finding.elementId)).toEqual(["dir", "file"]);
  });

  test("keeps consistency findings independent from supplied path evidence", () => {
    const ast = document([
      { kind: "heading", line: 1 },
      { kind: "prose", line: 2, text: "Updated prose" },
      { kind: "block", line: 3 },
    ]);
    const options = {
      changes: [change(ast.filePath, [[2, 2]])],
      current: [ast],
    };
    const withoutPaths = lintArchitectureDiff(options);
    const withPaths = lintArchitectureDiff({
      ...options,
      currentKnownPaths: new Set(["src/service.ts"]),
    });
    expect(withPaths.consistencyFindings).toEqual(withoutPaths.consistencyFindings);
    expect(withPaths.pathFindings).toEqual(withoutPaths.pathFindings);
  });

  describe("coverage findings (new-building-block-hint)", () => {
    const noChanges: FileChange[] = [];

    test("returns empty coverageFindings when no currentElements provided", () => {
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentKnownPaths: new Set(["src/foo.ts"]),
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("returns empty coverageFindings when no currentKnownPaths provided", () => {
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentElements: [bb("service", "src")],
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("returns empty coverageFindings when currentKnownPaths is empty", () => {
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentElements: [bb("service", "src")],
        currentKnownPaths: new Set(),
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("reports new-building-block-hint for path uncovered in current but not in base", () => {
      // base: element covers both src/app and src/lib
      // current: element only covers src/app → src/lib is newly uncovered
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentKnownPaths: trackedPaths,
        baseKnownPaths: trackedPaths,
        currentElements: [bb("app", "src/app")],
        baseElements: [bb("app", "src/app"), bb("lib", "src/lib")],
      });
      expect(result.coverageFindings).toHaveLength(1);
      expect(result.coverageFindings[0]?.kind).toBe("new-building-block-hint");
      expect(result.coverageFindings[0]?.severity).toBe("hint");
      expect(result.coverageFindings[0]?.file).toBe("src/lib");
      expect(result.coverageFindings[0]?.line).toBe(0);
      expect(result.coverageFindings[0]?.message).toContain("src/lib");
      expect(result.coverageFindings[0]?.message).toContain("building block");
    });

    test("does not report new-building-block-hint for path uncovered in both base and current", () => {
      // src/lib is uncovered in both snapshots — not newly uncovered
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentKnownPaths: trackedPaths,
        baseKnownPaths: trackedPaths,
        currentElements: [bb("app", "src/app")],
        baseElements: [bb("app", "src/app")],
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("reports all uncovered paths as new-building-block-hints when no baseElements provided", () => {
      // No base → any currently uncovered path is treated as newly uncovered
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentKnownPaths: trackedPaths,
        currentElements: [bb("app", "src/app")],
        // baseElements deliberately omitted
      });
      expect(result.coverageFindings).toHaveLength(1);
      expect(result.coverageFindings[0]?.file).toBe("src/lib");
    });

    test("coverage findings are sorted alphabetically by file", () => {
      // One element establishes a domain (src/), the other two sub-dirs are uncovered
      const trackedPaths = new Set([
        "src/zebra/index.ts",
        "src/alpha/index.ts",
        "src/middle/index.ts",
      ]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentKnownPaths: trackedPaths,
        currentElements: [bb("zebra", "src/zebra")], // alpha and middle are uncovered (no base)
      });
      const files = result.coverageFindings.map((f) => f.file);
      expect(files.length).toBeGreaterThan(0);
      expect(files).toEqual([...files].sort());
    });

    test("hasBlockingFindings is not affected by coverage findings", () => {
      // src/app is covered, src/lib is not — establishes a domain so uncovered paths appear
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        current: [],
        currentKnownPaths: trackedPaths,
        currentElements: [bb("app", "src/app")], // src/lib is newly uncovered (no base)
      });
      expect(result.coverageFindings.length).toBeGreaterThan(0);
      expect(result.hasBlockingFindings).toBe(false);
    });
  });
});
