import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";

function workspaceFromContent(filePath: string, content: string) {
  const doc = parseMarkdown(filePath, content);
  return buildWorkspace([doc]);
}

describe("W005 — multiple blocks under one heading", () => {
  test("emitted when two blocks share the same heading section", () => {
    const content = `## Interfaces

These two interfaces are in the same section.

:::interface
id: if-a
title: Interface A
between: bb-1, bb-2
:::

:::interface
id: if-b
title: Interface B
between: bb-2, bb-3
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W005")).toBe(true);
  });

  test("NOT emitted when each heading has one block", () => {
    const content = `## Interface A

Connects bb-1 to bb-2.

:::interface
id: if-a
title: Interface A
between: bb-1, bb-2
:::

## Interface B

Connects bb-2 to bb-3.

:::interface
id: if-b
title: Interface B
between: bb-2, bb-3
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W005")).toBe(false);
  });
});
