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

describe("H010 — quality goal not addressed by solution strategy", () => {
  test("emitted for high-priority goal with only a decision address (not a strategy)", () => {
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
    expect(validate(decisionOnly, buildIndex(decisionOnly)).some((d) => d.code === "H010")).toBe(
      true,
    );
  });

  test("NOT emitted when a solution strategy addresses the goal", () => {
    const strategyLinked = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "decision",
        id: "d-1",
        title: "D",
        status: "accepted",
        addresses: ["qg-1"],
        loc: loc(5),
      },
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: ["qg-1"],
        loc: loc(9),
      },
    ]);
    expect(
      validate(strategyLinked, buildIndex(strategyLinked)).some((d) => d.code === "H010"),
    ).toBe(false);
  });

  test("NOT emitted for medium/low priority goals without strategy", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-med", title: "Medium", priority: "medium", loc: loc(1) },
      { kind: "quality-goal", id: "qg-low", title: "Low", priority: "low", loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H010")).toBe(false);
  });

  test("emitted for high-priority goal without strategy", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-high", title: "High", priority: "high", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H010")).toBe(true);
  });
});
