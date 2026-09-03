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

describe("H008 — actor not connected to any interface", () => {
  test("emitted when actor has no interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H008")).toBe(true);
  });

  test("NOT emitted when actor is connected via interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["actor-1", "bb-1"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H008")).toBe(false);
  });
});
