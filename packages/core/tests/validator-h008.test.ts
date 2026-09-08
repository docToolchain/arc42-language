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

describe("H008 — actor without required interface", () => {
  test("emitted when actor has no required interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", requires: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H008")).toBe(true);
  });

  test("NOT emitted when actor is connected via interface", () => {
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
    expect(diags.some((d) => d.code === "H008")).toBe(false);
  });
});
