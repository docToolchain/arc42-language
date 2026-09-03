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

describe("W002 — isolated building-block", () => {
  test("emitted for leaf building-block with no interface", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-parent", title: "Parent", implements: [], loc: loc(1) },
      {
        kind: "building-block",
        id: "bb-1",
        title: "Lonely Child",
        parent: "bb-parent",
        implements: [],
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(true);
  });

  test("NOT emitted for root building-block (no parent) — checked by H004 instead", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-root", title: "Root", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(false);
  });

  test("NOT emitted when leaf building-block appears in an interface", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-parent", title: "Parent", implements: [], loc: loc(1) },
      {
        kind: "building-block",
        id: "bb-1",
        title: "A",
        parent: "bb-parent",
        implements: [],
        loc: loc(5),
      },
      {
        kind: "building-block",
        id: "bb-2",
        title: "B",
        parent: "bb-parent",
        implements: [],
        loc: loc(9),
      },
      { kind: "interface", id: "i-1", title: "I", between: ["bb-1", "bb-2"], loc: loc(13) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(false);
  });
});
