import { expect, test, describe } from "vite-plus/test";
import { parseAsciidoc } from "../src/parser/asciidoc-parser.ts";
import type { BlockNode, HeadingNode, ProseNode, IgnoreNode } from "../src/ast.ts";

// Helpers
function blocks(adoc: string) {
  return parseAsciidoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is BlockNode => n.kind === "block",
  );
}
function headings(adoc: string) {
  return parseAsciidoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is HeadingNode => n.kind === "heading",
  );
}
function prose(adoc: string) {
  return parseAsciidoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is ProseNode => n.kind === "prose",
  );
}
function ignores(adoc: string) {
  return parseAsciidoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is IgnoreNode => n.kind === "ignore",
  );
}

describe("AsciidocParser — headings", () => {
  test("parses = as h1", () => {
    const result = headings("= Title\n");
    expect(result).toHaveLength(1);
    expect(result[0]!.level).toBe(1);
    expect(result[0]!.text).toBe("Title");
  });

  test("parses == as h2, === as h3", () => {
    const result = headings("== Section\n=== Subsection\n");
    expect(result).toHaveLength(2);
    expect(result[0]!.level).toBe(2);
    expect(result[1]!.level).toBe(3);
  });

  test("records correct line number for heading", () => {
    const result = headings("Some prose\n== My Section\n");
    expect(result[0]!.line).toBe(2);
  });
});

describe("AsciidocParser — DSL blocks", () => {
  test("parses a block inside [source,arc42] / ---- fence", () => {
    const content = [
      "[source,arc42]",
      "----",
      ":::quality-goal",
      "id: qg-1",
      "title: Performance",
      "priority: high",
      ":::",
      "----",
    ].join("\n");
    const result = blocks(content);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[0]!.attributes["id"]).toBe("qg-1");
    expect(result[0]!.attributes["title"]).toBe("Performance");
    expect(result[0]!.inArc42Fence).toBe(true);
  });

  test("block outside arc42 fence has inArc42Fence=false", () => {
    const content = [":::building-block", "id: bb-1", "title: X", ":::"].join("\n");
    const result = blocks(content);
    expect(result).toHaveLength(1);
    expect(result[0]!.inArc42Fence).toBe(false);
  });

  test("records correct start line for block inside fence", () => {
    const content = [
      "= Heading",
      "[source,arc42]",
      "----",
      ":::building-block",
      "id: bb-1",
      "title: X",
      ":::",
      "----",
    ].join("\n");
    const result = blocks(content);
    expect(result[0]!.startLine).toBe(4);
  });

  test("unclosed block at EOF emits __parse_error__", () => {
    const content = ["[source,arc42]", "----", ":::building-block", "id: bb-1"].join("\n");
    const result = blocks(content);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("__parse_error__");
  });
});

describe("AsciidocParser — prose", () => {
  test("emits prose lines outside blocks", () => {
    const result = prose("Some explanation text.\nMore prose.\n");
    expect(result.some((p) => p.text.includes("Some explanation"))).toBe(true);
    expect(result.some((p) => p.text.includes("More prose"))).toBe(true);
  });

  test("line comments are skipped", () => {
    const result = prose("// This is a comment\nActual prose\n");
    expect(result.some((p) => p.text.includes("comment"))).toBe(false);
    expect(result.some((p) => p.text.includes("Actual prose"))).toBe(true);
  });

  test("block comments //// ... //// are skipped", () => {
    const result = prose("////\nThis is hidden\n////\nVisible prose\n");
    expect(result.some((p) => p.text.includes("hidden"))).toBe(false);
    expect(result.some((p) => p.text.includes("Visible prose"))).toBe(true);
  });
});

describe("AsciidocParser — ignore directives", () => {
  test("single-line :::ignore inside fence", () => {
    const content = [
      "[source,arc42]",
      "----",
      ":::ignore W016 not relevant here ::::",
      "----",
    ].join("\n");
    const result = ignores(content);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("W016");
  });
});

describe("AsciidocParser — bare mermaid", () => {
  test("bare [source,mermaid] block emits bare-mermaid node", () => {
    const content = ["[source,mermaid]", "----", "graph LR", "  A --> B", "----"].join("\n");
    const { nodes } = parseAsciidoc("test.arc42.adoc", content);
    const bare = nodes.filter((n) => n.kind === "bare-mermaid");
    expect(bare).toHaveLength(1);
  });
});

describe("AsciidocParser — multiple blocks", () => {
  test("parses multiple blocks from a realistic document", () => {
    const content = [
      "= Architecture",
      "",
      "== Quality Goals",
      "",
      "[source,arc42]",
      "----",
      ":::quality-goal",
      "id: qg-perf",
      "title: Performance",
      "priority: high",
      ":::",
      "----",
      "",
      "== Building Blocks",
      "",
      "[source,arc42]",
      "----",
      ":::building-block",
      "id: bb-core",
      "title: Core Library",
      "technology: TypeScript",
      ":::",
      "----",
    ].join("\n");
    const result = blocks(content);
    expect(result).toHaveLength(2);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[1]!.blockType).toBe("building-block");
  });
});
