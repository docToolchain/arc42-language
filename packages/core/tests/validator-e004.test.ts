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

describe("validator › E004", () => {
  test("E004 — interface.between references non-building-block", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["bb-1", "qg-1"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(true);
  });

  test("E004 — NOT emitted for valid actor↔building-block interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["actor-1", "bb-1"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(false);
  });

  test("E004 — emitted for actor↔actor interface (no building-block on either side)", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
      { kind: "actor", id: "actor-2", title: "Partner", type: "system", loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["actor-1", "actor-2"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(true);
  });
});
