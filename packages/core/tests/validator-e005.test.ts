import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[], parseErrors: Workspace["parseErrors"] = []): Workspace {
  return { elements, parseErrors, documents: [], diagrams: [] };
}

describe("E005 — parse error surfaced as diagnostic", () => {
  test("parse error is surfaced as E005 diagnostic", () => {
    const ws = makeWorkspace([], [{ message: "Missing 'id'", file: "f.arc42.md", line: 3 }]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const e005 = diags.filter((d) => d.code === "E005");
    expect(e005).toHaveLength(1);
    expect(e005[0]!.severity).toBe("error");
  });
});
