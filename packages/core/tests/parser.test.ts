import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";

describe("parseMarkdown", () => {
  test("empty file → empty nodes array", () => {
    const ast = parseMarkdown("test.arc42.md", "");
    expect(ast.nodes).toHaveLength(0);
    expect(ast.filePath).toBe("test.arc42.md");
  });

  test("single quality-goal block → one BlockNode with correct fields", () => {
    const content = `:::quality-goal
id: qg-perf
title: Performance
priority: high
:::`;
    const ast = parseMarkdown("test.arc42.md", content);
    expect(ast.nodes).toHaveLength(1);
    const node = ast.nodes[0]!;
    expect(node.kind).toBe("block");
    if (node.kind !== "block") throw new Error("unexpected");
    expect(node.blockType).toBe("quality-goal");
    expect(node.attributes["id"]).toBe("qg-perf");
    expect(node.attributes["title"]).toBe("Performance");
    expect(node.attributes["priority"]).toBe("high");
    expect(node.startLine).toBe(1);
    expect(node.endLine).toBe(5);
  });

  test("mixed prose + block + heading → correct node sequence", () => {
    const content = `# My Architecture

Some prose here.

:::decision
id: dec-1
title: Use REST
status: accepted
:::`;
    const ast = parseMarkdown("test.arc42.md", content);
    expect(ast.nodes).toHaveLength(3);
    expect(ast.nodes[0]!.kind).toBe("heading");
    expect(ast.nodes[1]!.kind).toBe("prose");
    expect(ast.nodes[2]!.kind).toBe("block");
  });

  test("heading level is parsed correctly", () => {
    const ast = parseMarkdown("f.arc42.md", "## Section Two");
    const node = ast.nodes[0]!;
    expect(node.kind).toBe("heading");
    if (node.kind !== "heading") throw new Error();
    expect(node.level).toBe(2);
    expect(node.text).toBe("Section Two");
  });

  test("unclosed block → no BlockNode emitted", () => {
    const content = `:::quality-goal
id: qg-x
title: Unclosed`;
    const ast = parseMarkdown("test.arc42.md", content);
    expect(ast.nodes.filter((n) => n.kind === "block")).toHaveLength(0);
  });

  test("multi-value attribute stored as raw string", () => {
    const content = `:::building-block
id: bb-1
title: Service
implements: concept-a, concept-b
:::`;
    const ast = parseMarkdown("test.arc42.md", content);
    const block = ast.nodes[0]!;
    if (block.kind !== "block") throw new Error();
    expect(block.attributes["implements"]).toBe("concept-a, concept-b");
  });

  test("unknown block type emitted as-is (parser stays dumb)", () => {
    const content = `:::unknown-type
id: x
title: Test
:::`;
    const ast = parseMarkdown("test.arc42.md", content);
    const block = ast.nodes[0]!;
    expect(block.kind).toBe("block");
    if (block.kind !== "block") throw new Error();
    expect(block.blockType).toBe("unknown-type");
  });
});
