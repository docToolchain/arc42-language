import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[], parseErrors: Workspace["parseErrors"] = []): Workspace {
  return { elements, parseErrors, documents: [], diagrams: [] };
}

function workspaceFromContent(filePath: string, content: string): Workspace {
  const doc = parseMarkdown(filePath, content);
  return buildWorkspace([doc]);
}

function loc(line = 1) {
  return { file: "test.arc42.md", line };
}

describe("validator › W004", () => {
  test("W004 — block without preceding prose in section", () => {
    const content = `## My Section
:::building-block
id: bb-naked
title: Naked Block
technology: Go
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W004")).toBe(true);
  });

  test("W004 — NOT emitted when prose precedes the block", () => {
    const content = `## My Section

This block does something useful.

:::building-block
id: bb-described
title: Described Block
technology: Go
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W004")).toBe(false);
  });

  test("W004 — emitted for second block if no prose between blocks", () => {
    const content = `## Section

Some intro prose.

:::building-block
id: bb-first
title: First
technology: Go
:::
:::concept
id: c-naked
title: Naked Concept
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const w004 = diags.filter((d) => d.code === "W004");
    expect(w004.length).toBeGreaterThanOrEqual(1);
    expect(w004.some((d) => d.message.includes("c-naked"))).toBe(true);
  });
});
