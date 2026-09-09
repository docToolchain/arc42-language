import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import type { BlockNode, HeadingNode, ProseNode, IgnoreNode } from "../src/ast.ts";

// Helpers
function blocks(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter((n): n is BlockNode => n.kind === "block");
}
function headings(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter(
    (n): n is HeadingNode => n.kind === "heading",
  );
}
function prose(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter((n): n is ProseNode => n.kind === "prose");
}
function ignores(md: string) {
  return parseMarkdown("test.arc42.md", md).nodes.filter(
    (n): n is IgnoreNode => n.kind === "ignore",
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

  test("preserves blank lines between prose paragraphs as empty prose nodes", () => {
    // Blank lines between a table and a following paragraph must be preserved
    // so that marked does not absorb the paragraph as a table row.
    const md = `| col |\n| --- |\n| row |\n\n**After table**`;
    const result = prose(md);
    // There must be at least one empty-text prose node (the blank line)
    expect(result.some((p) => p.text === "")).toBe(true);
    // The bold line must also be present
    expect(result.some((p) => p.text.includes("After table"))).toBe(true);
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

describe("parser — arc42 fence handling", () => {
  test("block inside ```arc42 fence is parsed identically to unwrapped block", () => {
    const md = `\`\`\`arc42\n:::quality-goal\nid: qg-1\ntitle: Performance\npriority: high\n:::\n\`\`\``;
    const result = blocks(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[0]!.attributes["id"]).toBe("qg-1");
    expect(result[0]!.attributes["priority"]).toBe("high");
  });

  test("block inside fence has inArc42Fence=true", () => {
    const md = `\`\`\`arc42\n:::building-block\nid: bb-1\ntitle: X\n:::\n\`\`\``;
    const result = blocks(md);
    expect(result[0]!.inArc42Fence).toBe(true);
  });

  test("block outside fence has inArc42Fence=false", () => {
    const md = `:::building-block\nid: bb-1\ntitle: X\n:::`;
    const result = blocks(md);
    expect(result[0]!.inArc42Fence).toBe(false);
  });

  test("line numbers are correct for block inside fence", () => {
    // line 1: ```arc42
    // line 2: :::building-block
    // line 3: id: bb-1
    // line 4: title: X
    // line 5: :::
    // line 6: ```
    const md = `\`\`\`arc42\n:::building-block\nid: bb-1\ntitle: X\n:::\n\`\`\``;
    const result = blocks(md);
    expect(result[0]!.startLine).toBe(2);
    expect(result[0]!.endLine).toBe(5);
  });

  test("closing ``` of fence is not emitted as prose", () => {
    const md = `\`\`\`arc42\n:::concept\nid: c-1\ntitle: X\n:::\n\`\`\``;
    const result = parseMarkdown("test.arc42.md", md).nodes;
    const proseNodes = result.filter((n) => n.kind === "prose");
    expect(proseNodes).toHaveLength(0);
  });

  test("other fenced code blocks (e.g. ```bash) are not affected", () => {
    const md = `\`\`\`bash\necho hello\n\`\`\`\n:::concept\nid: c-1\ntitle: X\n:::`;
    const result = blocks(md);
    // The :::concept outside any arc42 fence should still be parsed
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("concept");
    expect(result[0]!.inArc42Fence).toBe(false);
  });

  test("multiple blocks in one arc42 fence are all parsed", () => {
    const md = `\`\`\`arc42\n:::quality-goal\nid: qg-1\ntitle: A\npriority: high\n:::\n:::concept\nid: c-1\ntitle: B\n:::\n\`\`\``;
    const result = blocks(md);
    expect(result).toHaveLength(2);
    expect(result[0]!.inArc42Fence).toBe(true);
    expect(result[1]!.inArc42Fence).toBe(true);
  });

  test("diagram metadata is parsed only inside an arc42 fence", () => {
    const md = `\`\`\`arc42\n:::diagram\nid: d-1\nscenario: s-1\nnotation: mermaid-sequence\n:::\n\`\`\`\n\`\`\`mermaid\nsequenceDiagram\n  A->>B: hi\n\`\`\``;
    const diagrams = parseMarkdown("test.arc42.md", md).nodes.filter((n) => n.kind === "diagram");
    expect(diagrams).toHaveLength(1);
  });

  test("unwrapped diagram metadata is not parsed as a diagram", () => {
    const md = `:::diagram\nid: d-1\nnotation: mermaid-architecture\n:::`;
    const result = parseMarkdown("test.arc42.md", md);
    expect(result.nodes.some((node) => node.kind === "diagram")).toBe(false);
    expect(result.nodes.some((node) => node.kind === "block" && node.blockType === "diagram")).toBe(
      true,
    );
  });
});

describe("parser — ignore directive handling", () => {
  test("valid inline ignore directive inside arc42 fence is parsed", () => {
    const md = `\`\`\`arc42\n:::ignore E005 Missing priority\n:::\n\`\`\``;
    const result = ignores(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("E005");
    expect(result[0]!.reason).toBe("Missing priority");
    expect(result[0]!.startLine).toBe(2);
    expect(result[0]!.endLine).toBe(3);
  });

  test("trimmed reason is captured correctly", () => {
    const md = `\`\`\`arc42\n:::ignore   E002   this is a reason   \n:::\n\`\`\``;
    const result = ignores(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("E002");
    expect(result[0]!.reason).toBe("this is a reason");
  });

  test("bare directive (no rule code) produces inert ignore node", () => {
    const md = `\`\`\`arc42\n:::ignore\n:::\n\`\`\``;
    const result = ignores(md);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("");
    expect(result[0]!.reason).toBeUndefined();
  });

  test("multiple ignore directives are all parsed", () => {
    const md = `\`\`\`arc42\n:::ignore E001 reason1\n:::\n:::ignore E002 reason2\n:::\n\`\`\``;
    const result = ignores(md);
    expect(result).toHaveLength(2);
    expect(result[0]!.ruleCode).toBe("E001");
    expect(result[1]!.ruleCode).toBe("E002");
  });

  test("ignore directive outside arc42 fence is NOT parsed as ignore node", () => {
    const md = `:::ignore E005 reason\n:::\n:::building-block\nid: bb-1\ntitle: X\n:::`;
    const result = ignores(md);
    expect(result).toHaveLength(0);
    // The directive line should appear as prose instead
    const proseNodes = prose(md);
    expect(proseNodes.some((p) => p.text.includes(":::ignore"))).toBe(true);
  });

  test("line numbers are correct for ignore directive", () => {
    const md = `line1\n\`\`\`arc42\n:::ignore E005 reason\n:::\n\`\`\``;
    const result = ignores(md);
    expect(result[0]!.startLine).toBe(3);
    expect(result[0]!.endLine).toBe(4);
  });

  test("block inside arc42 fence has inArc42Fence=true", () => {
    const md = `\`\`\`arc42\n:::building-block\nid: bb-1\ntitle: X\n:::\n\`\`\``;
    const result = blocks(md);
    expect(result[0]!.inArc42Fence).toBe(true);
  });

  test("unknown block type after ignore directive is still handled", () => {
    const md = `\`\`\`arc42\n:::ignore E005 reason\n:::\n:::unknown-block\nid: x\n:::\n\`\`\``;
    const blocksResult = blocks(md);
    expect(blocksResult).toHaveLength(1);
    expect(blocksResult[0]!.blockType).toBe("unknown-block");
    expect(blocksResult[0]!.inArc42Fence).toBe(true);
  });
});
