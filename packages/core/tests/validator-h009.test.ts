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

describe("validator › H009", () => {
  test("H009 — solution strategy without addresses", () => {
    const ws = makeWorkspace([
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: [],
        loc: loc(1),
      },
    ]);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "H009")).toBe(true);
    expect(diags.find((d) => d.code === "H009")!.severity).toBe("hint");
  });

  test("H009 — NOT emitted for an addressed strategy or duplicate strategies", () => {
    const addressed = makeWorkspace([
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: ["qg-1"],
        loc: loc(1),
      },
    ]);
    const duplicate = makeWorkspace([
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: [],
        loc: loc(1),
      },
      {
        kind: "solution-strategy",
        id: "strategy-2",
        title: "Duplicate",
        addresses: [],
        loc: loc(5),
      },
    ]);
    expect(validate(addressed, buildIndex(addressed)).some((d) => d.code === "H009")).toBe(false);
    const duplicateCodes = validate(duplicate, buildIndex(duplicate)).map((d) => d.code);
    expect(duplicateCodes).toContain("E007");
    expect(duplicateCodes).not.toContain("H009");
  });
});
