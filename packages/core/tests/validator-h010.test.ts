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

describe("validator › H010", () => {
  test("H010 — quality goal must be addressed by solution strategy, not decision", () => {
    const decisionOnly = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "decision",
        id: "d-1",
        title: "D",
        status: "accepted",
        addresses: ["qg-1"],
        loc: loc(5),
      },
    ]);
    const strategyLinked = makeWorkspace([
      ...decisionOnly.elements,
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: ["qg-1"],
        loc: loc(9),
      },
    ]);
    expect(validate(decisionOnly, buildIndex(decisionOnly)).some((d) => d.code === "H010")).toBe(
      true,
    );
    expect(
      validate(strategyLinked, buildIndex(strategyLinked)).some((d) => d.code === "H010"),
    ).toBe(false);
  });

  test("H010 — NOT emitted for medium/low priority goals without strategy", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-med", title: "Medium", priority: "medium", loc: loc(1) },
      { kind: "quality-goal", id: "qg-low", title: "Low", priority: "low", loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H010")).toBe(false);
  });

  test("H010 — emitted for high-priority goal without strategy", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-high", title: "High", priority: "high", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H010")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // W014 — quality goals not in descending priority order
  // -------------------------------------------------------------------------
});
