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

describe("E003 — circular parent reference", () => {
  test("emitted when two building-blocks reference each other as parent", () => {
    const ws = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-a",
        title: "A",
        parent: "bb-b",
        implements: [],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-b",
        title: "B",
        parent: "bb-a",
        implements: [],
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E003")).toBe(true);
  });
});
