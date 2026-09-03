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

describe("H003 — building-block without technology", () => {
  test("emitted when building-block has no technology set", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-1", title: "X", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H003")).toBe(true);
  });

  test("NOT emitted when technology is set", () => {
    const ws = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-1",
        title: "X",
        technology: "Go",
        implements: [],
        loc: loc(1),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H003")).toBe(false);
  });
});
