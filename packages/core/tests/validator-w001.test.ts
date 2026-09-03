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

describe("validator › W001", () => {
  test("W001 — concept with no implementing building-block", () => {
    const ws = makeWorkspace([{ kind: "concept", id: "c-1", title: "Logging", loc: loc(1) }]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W001")).toBe(true);
  });

  test("W001 — NOT emitted when a building-block implements the concept", () => {
    const ws = makeWorkspace([
      { kind: "concept", id: "c-1", title: "Logging", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "Logger", implements: ["c-1"], loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W001")).toBe(false);
  });
});
