import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[], parseErrors: Workspace["parseErrors"] = []): Workspace {
  return { elements, parseErrors, documents: [], diagrams: [] };
}

function workspaceFromContent(filePath: string, content: string): Workspace {
  const doc = parseMarkdown(filePath, content);
  return buildWorkspace([doc]);
}

function loc(line = 1) {
  return { file: "test.arc42.md", line };
}

describe("validator › W012", () => {
  test("W012 and H012 activate only for deployment workspaces and exempt composites/groups", () => {
    const inactive = makeWorkspace([
      { kind: "building-block", id: "bb-api", title: "API", implements: [], loc: loc(1) },
    ]);
    expect(
      validate(inactive, buildIndex(inactive)).some((diagnostic) =>
        ["W012", "H012"].includes(diagnostic.code),
      ),
    ).toBe(false);

    const active = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-composite",
        title: "Composite",
        implements: [],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-leaf",
        title: "Leaf",
        parent: "bb-composite",
        implements: [],
        loc: loc(5),
      },
      { kind: "building-block", id: "bb-unmapped", title: "Unmapped", implements: [], loc: loc(9) },
      { kind: "deployment-node", id: "node-root", title: "Root", hosts: [], loc: loc(13) },
      {
        kind: "deployment-node",
        id: "node-empty",
        title: "Empty",
        hosts: [],
        parent: "node-root",
        loc: loc(17),
      },
    ]);
    const diagnostics = validate(active, buildIndex(active));
    expect(
      diagnostics.filter((diagnostic) => diagnostic.code === "W012").map((d) => d.message),
    ).toEqual([expect.stringContaining("bb-leaf"), expect.stringContaining("bb-unmapped")]);
    expect(
      diagnostics.filter((diagnostic) => diagnostic.code === "H012").map((d) => d.message),
    ).toEqual([expect.stringContaining("node-empty")]);
  });

  test("W012 accepts many-to-many deployment mappings", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-api", title: "API", implements: [], loc: loc(1) },
      {
        kind: "deployment-node",
        id: "node-a",
        title: "A",
        hosts: ["bb-api", "bb-api"],
        loc: loc(5),
      },
      {
        kind: "deployment-node",
        id: "node-b",
        title: "B",
        hosts: ["bb-api"],
        loc: loc(9),
      },
    ]);
    expect(
      validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "W012"),
    ).toHaveLength(0);
  });
});
