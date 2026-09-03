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

describe("H013 — quality-goal without elaborating quality-scenario", () => {
  test("emitted when quality-goal has no quality-scenario", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H013")).toBe(true);
  });

  test("NOT emitted when quality-goal has at least one quality-scenario", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "quality-scenario",
        id: "qs-1",
        title: "Scenario",
        quality: "qg-1",
        metric: "p95 < 500ms",
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H013")).toBe(false);
  });
});
