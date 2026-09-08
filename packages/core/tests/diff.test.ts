import { describe, expect, test } from "vite-plus/test";
import type { DocumentAst } from "../src/ast.ts";
import { analyzeArchitectureDiff, type FileChange } from "../src/diff.ts";

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

describe("architecture diff analyzer", () => {
  test("reports a block-only change and ignores an unrelated section", () => {
    const ast = document([
      { kind: "heading", line: 1, text: "Service" },
      { kind: "prose", line: 2 },
      { kind: "block", line: 3 },
      { kind: "heading", line: 5, text: "Other" },
      { kind: "prose", line: 6 },
    ]);
    const result = analyzeArchitectureDiff({
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
    const result = analyzeArchitectureDiff({
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
    const result = analyzeArchitectureDiff({
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
    const result = analyzeArchitectureDiff({
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
    const result = analyzeArchitectureDiff({
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
          blockType: "building-block",
          attributes: { id: "service", title: "Service", implements: "", path: "src/service" },
          startLine: 1,
          endLine: 1,
          inArc42Fence: true,
        },
      ],
    };
    const result = analyzeArchitectureDiff({
      changes: [change("src/service/index.ts", [[4, 4]])],
      current: [ast],
    });
    expect(result.pathFindings).toHaveLength(1);
    expect(result.pathFindings[0]?.severity).toBe("hint");
    expect(result.hasBlockingFindings).toBe(false);
    expect(result.affectedRanges).toHaveLength(0);
  });

  test("uses path components rather than textual prefixes", () => {
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
    const result = analyzeArchitectureDiff({
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
          blockType: "building-block",
          attributes: { id: "file", title: "File", implements: "", path: "src/Makefile" },
          startLine: 1,
          endLine: 1,
          inArc42Fence: true,
        },
        {
          kind: "block",
          blockType: "interface",
          attributes: { id: "dir", title: "Dir", between: "a,b", path: "src/foo.test" },
          startLine: 2,
          endLine: 2,
          inArc42Fence: true,
        },
        {
          kind: "block",
          blockType: "building-block",
          attributes: { id: "missing", title: "Missing", implements: "", path: "src/missing" },
          startLine: 3,
          endLine: 3,
          inArc42Fence: true,
        },
      ],
    };
    const result = analyzeArchitectureDiff({
      changes: [
        change("src/Makefile", [[4, 4]]),
        change("src/foo.test/index.ts", [[5, 5]]),
        change("src/missing/file.ts", [[6, 6]]),
      ],
      current: [ast],
      knownPaths: new Set(["src/Makefile", "src/foo.test/index.ts"]),
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
    const withoutPaths = analyzeArchitectureDiff(options);
    const withPaths = analyzeArchitectureDiff({
      ...options,
      knownPaths: new Set(["src/service.ts"]),
    });
    expect(withPaths.consistencyFindings).toEqual(withoutPaths.consistencyFindings);
    expect(withPaths.pathFindings).toEqual(withoutPaths.pathFindings);
  });
});
