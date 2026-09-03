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

describe("E009 — deployment node cycle", () => {
  test("emitted when two deployment nodes reference each other as parent", () => {
    const ws = makeWorkspace([
      {
        kind: "deployment-node",
        id: "node-a",
        title: "A",
        hosts: [],
        parent: "node-b",
        loc: loc(1),
      },
      {
        kind: "deployment-node",
        id: "node-b",
        title: "B",
        hosts: [],
        parent: "node-a",
        loc: loc(5),
      },
    ]);
    expect(
      validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E009"),
    ).toHaveLength(2);
  });

  test("emitted when a deployment node references itself as parent", () => {
    const ws = makeWorkspace([
      {
        kind: "deployment-node",
        id: "node-self",
        title: "Self",
        hosts: [],
        parent: "node-self",
        loc: loc(1),
      },
    ]);
    expect(
      validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E009"),
    ).toHaveLength(1);
  });
});
