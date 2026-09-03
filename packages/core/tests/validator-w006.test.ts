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

describe("validator › W006", () => {
  test("W006 — fires when only 1 high-priority goal exists (low-priority not counted)", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-h", title: "High", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-l1", title: "Low1", priority: "low", loc: loc(5) },
      { kind: "quality-goal", id: "qg-l2", title: "Low2", priority: "low", loc: loc(9) },
      { kind: "quality-goal", id: "qg-l3", title: "Low3", priority: "low", loc: loc(13) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W006")).toBe(true);
  });

  test("W006 — NOT fired when 3 high-priority goals exist", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-h1", title: "High1", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-h2", title: "High2", priority: "high", loc: loc(5) },
      { kind: "quality-goal", id: "qg-h3", title: "High3", priority: "high", loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W006")).toBe(false);
  });
});
