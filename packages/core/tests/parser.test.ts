import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import type { BlockNode, HeadingNode, ProseNode } from "../src/ast.ts";

// Helpers
function blocks(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter(
    (n): n is BlockNode => n.kind === "block",
  );
}
function headings(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter(
    (n): n is HeadingNode => n.kind === "heading",
  );
}
function prose(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter(
    (n): n is ProseNode => n.kind === "prose",
  );
}

describe("parser — basic structure", () => {
  test("parses a simple block with attributes", () => {
    const md = `:::quality-goal
id: qg-1
title: Performance
priority: high
:::`;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[0]!.attributes["id"]).toBe("qg-1");
    expect(result[0]!.attributes["title"]).toBe("Performance");
    expect(result[0]!.attributes["priority"]).toBe("high");
  });

  test("records correct start and end line numbers", () => {
    const md = `line one\n:::building-block\nid: bb-1\ntitle: X\n:::`;
    const result = blocks(md);
    expect(result[0]!.startLine).toBe(2);
    expect(result[0]!.endLine).toBe(5);
  });

  test("parses headings at all levels", () => {
    const md = `# H1\n## H2\n### H3`;
    const result = headings(md);
    expect(result).toHaveLength(3);
    expect(result[0]!.level).toBe(1);
    expect(result[1]!.level).toBe(2);
    expect(result[2]!.level).toBe(3);
  });

  test("parses prose lines outside blocks", () => {
    const md = `Some explanation text.\n:::building-block\nid: bb-1\ntitle: X\n:::\nMore prose.`;
    const result = prose(md);
    expect(result.some((p) => p.text.includes("Some explanation"))).toBe(true);
    expect(result.some((p) => p.text.includes("More prose"))).toBe(true);
  });

  test("parses multiple blocks in one file", () => {
    const md = `:::quality-goal\nid: qg-1\ntitle: A\npriority: high\n:::\n:::concept\nid: c-1\ntitle: B\n:::`;
    const result = blocks(md);
    expect(result).toHaveLength(2);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[1]!.blockType).toBe("concept");
  });

  test("unknown block type is emitted as-is (builder rejects it)", () => {
    const md = `:::unknown-type\nid: x\n:::`;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("unknown-type");
  });
});

describe("parser — HTML comment handling", () => {
  test("single-line comment is ignored", () => {
    const md = `<!-- this is a comment -->\n:::quality-goal\nid: qg-1\ntitle: A\npriority: high\n:::`;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("quality-goal");
  });

  test("multi-line comment is ignored entirely", () => {
    const md = `<!--\n:::building-block\nid: fake\ntitle: Should not be parsed\n:::\n-->\n:::quality-goal\nid: qg-real\ntitle: Real\npriority: high\n:::`;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.attributes["id"]).toBe("qg-real");
  });

  test("headings inside comment are not emitted", () => {
    const md = `<!--\n## Hidden Heading\n-->\n## Visible Heading`;
    const result = headings(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Visible Heading");
  });

  test("prose inside comment is not emitted", () => {
    const md = `<!-- hidden prose -->\nvisible prose`;
    const result = prose(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("visible prose");
  });

  test("content after comment close is parsed normally", () => {
    const md = `<!--\nsome guidance\n-->\n:::concept\nid: c-1\ntitle: Real Concept\n:::`;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("concept");
  });

  test("multiple comment blocks in the same file are all ignored", () => {
    const md = `<!--\n:::building-block\nid: fake-1\ntitle: Fake\n:::\n-->\n:::quality-goal\nid: qg-1\ntitle: Real\npriority: high\n:::\n<!--\n:::concept\nid: fake-2\ntitle: Also fake\n:::\n-->`;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.attributes["id"]).toBe("qg-1");
  });

  test("template starter file produces zero blocks", () => {
    const templateContent = `# Quality Goals\n\n<!--\nSome guidance text.\n\n:::quality-goal\nid: qg-example\ntitle: Example\npriority: high\n:::\n-->`;
    const result = blocks(templateContent);
    expect(result).toHaveLength(0);
  });
});
