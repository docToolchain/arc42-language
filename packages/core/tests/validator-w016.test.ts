import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";

function workspaceFromContent(filePath: string, content: string) {
  const doc = parseMarkdown(filePath, content);
  return buildWorkspace([doc]);
}

describe("W016 — block not wrapped in ```arc42 fence", () => {
  test("emitted when a block is not inside an arc42 fence", () => {
    const content = `## My Section\n\nSome prose.\n\n:::building-block\nid: bb-1\ntitle: My Block\ntechnology: Go\n:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W016")).toBe(true);
  });

  test("NOT emitted when a block is inside an arc42 fence", () => {
    const content = `## My Section\n\nSome prose.\n\n\`\`\`arc42\n:::building-block\nid: bb-1\ntitle: My Block\ntechnology: Go\n:::\n\`\`\``;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W016")).toBe(false);
  });

  test("diagnostic message includes block id", () => {
    const content = `:::building-block\nid: bb-unwrapped\ntitle: X\ntechnology: Go\n:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const w016 = diags.filter((d) => d.code === "W016");
    expect(w016.some((d) => d.message.includes("bb-unwrapped"))).toBe(true);
  });

  test("NOT emitted for :::diagram blocks (exempt)", () => {
    const content = `:::diagram\nid: d-1\nscenario: s-1\nnotation: mermaid-sequence\n:::\n\`\`\`mermaid\nsequenceDiagram\n  A->>B: hi\n\`\`\``;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W016")).toBe(false);
  });

  test("emitted once per unwrapped block", () => {
    const content = [
      `\`\`\`arc42`,
      `:::quality-goal`,
      `id: qg-wrapped`,
      `title: Wrapped Goal`,
      `priority: high`,
      `:::`,
      `\`\`\``,
      ``,
      `:::concept`,
      `id: c-unwrapped`,
      `title: Unwrapped Concept`,
      `:::`,
    ].join("\n");
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const w016 = diags.filter((d) => d.code === "W016");
    expect(w016).toHaveLength(1);
    expect(w016[0]!.message).toContain("c-unwrapped");
  });

  test("reports correct line number for unwrapped block", () => {
    // line 1: :::building-block
    // line 2: id: bb-1
    // line 3: title: X
    // line 4: :::
    const content = `:::building-block\nid: bb-1\ntitle: X\ntechnology: Go\n:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const w016 = diags.filter((d) => d.code === "W016");
    expect(w016[0]!.line).toBe(1);
  });
});
