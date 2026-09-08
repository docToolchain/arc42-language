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

describe("E004 — interface provider is not a building-block", () => {
  test("emitted when interface provider is a non-building-block element", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], requires: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", provider: "qg-1", loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(true);
  });

  test("NOT emitted for a valid building-block provider", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-1",
        title: "User",
        type: "person",
        requires: ["i-1"],
        loc: loc(1),
      },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], requires: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", provider: "bb-1", loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(false);
  });

  test("emitted when an actor is named as provider", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-1",
        title: "User",
        type: "person",
        requires: ["i-1"],
        loc: loc(1),
      },
      {
        kind: "actor",
        id: "actor-2",
        title: "Partner",
        type: "system",
        requires: ["i-1"],
        loc: loc(5),
      },
      { kind: "interface", id: "i-1", title: "I", provider: "actor-2", loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(true);
  });
});
