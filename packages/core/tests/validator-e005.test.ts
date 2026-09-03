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

describe("validator › E005", () => {
  test("E005 — parse error surfaced as E005 diagnostic", () => {
    const ws = makeWorkspace([], [{ message: "Missing 'id'", file: "f.arc42.md", line: 3 }]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const e005 = diags.filter((d) => d.code === "E005");
    expect(e005).toHaveLength(1);
    expect(e005[0]!.severity).toBe("error");
  });
});
