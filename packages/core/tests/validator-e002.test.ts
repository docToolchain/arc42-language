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

describe("validator › E002", () => {
  test("E002 — unresolved reference", () => {
    const ws = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-1",
        title: "X",
        parent: "bb-missing",
        implements: [],
        loc: loc(1),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E002")).toBe(true);
  });

  test("E002 — solution strategy unresolved address", () => {
    const ws = makeWorkspace([
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: ["qg-missing"],
        loc: loc(1),
      },
    ]);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "E002")).toBe(true);
  });

  test("E002 — deployment references require correct target kinds", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "deployment-node",
        id: "node-1",
        title: "Node",
        hosts: ["qg-1", "bb-missing"],
        parent: "qg-1",
        loc: loc(5),
      },
    ]);
    const e002 = validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E002");
    expect(e002).toHaveLength(3);
    expect(e002.filter((diagnostic) => diagnostic.message.includes("deployment"))).toHaveLength(2);
    expect(e002.some((diagnostic) => diagnostic.message.includes("bb-missing"))).toBe(true);
  });
});
