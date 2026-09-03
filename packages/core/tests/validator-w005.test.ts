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

describe("validator › W005", () => {
  test("W005 — multiple blocks under one heading", () => {
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

  test("W005 — NOT emitted when each heading has one block", () => {
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

  // -------------------------------------------------------------------------
  // W013 — quality-scenario no metric
  // -------------------------------------------------------------------------
});
