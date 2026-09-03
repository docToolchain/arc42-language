import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[], parseErrors: Workspace["parseErrors"] = []): Workspace {
  return { elements, parseErrors, documents: [], diagrams: [] };
}

function loc(line = 1) {
  return { file: "test.arc42.md", line };
}

describe("W007 — too many quality goals", () => {
  test("fires when 6 high-priority goals exist", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q1", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-2", title: "Q2", priority: "high", loc: loc(5) },
      { kind: "quality-goal", id: "qg-3", title: "Q3", priority: "high", loc: loc(9) },
      { kind: "quality-goal", id: "qg-4", title: "Q4", priority: "high", loc: loc(13) },
      { kind: "quality-goal", id: "qg-5", title: "Q5", priority: "high", loc: loc(17) },
      { kind: "quality-goal", id: "qg-6", title: "Q6", priority: "high", loc: loc(21) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W007")).toBe(true);
  });

  test("NOT fired when 6 low-priority goals exist (only high counted)", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q1", priority: "low", loc: loc(1) },
      { kind: "quality-goal", id: "qg-2", title: "Q2", priority: "low", loc: loc(5) },
      { kind: "quality-goal", id: "qg-3", title: "Q3", priority: "low", loc: loc(9) },
      { kind: "quality-goal", id: "qg-4", title: "Q4", priority: "low", loc: loc(13) },
      { kind: "quality-goal", id: "qg-5", title: "Q5", priority: "low", loc: loc(17) },
      { kind: "quality-goal", id: "qg-6", title: "Q6", priority: "low", loc: loc(21) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W007")).toBe(false);
  });
});
