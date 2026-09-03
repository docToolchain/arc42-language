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

describe("validator › E009", () => {
  test("E009 — deployment parent cycles", () => {
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

  test("E009 — deployment self-cycle", () => {
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
