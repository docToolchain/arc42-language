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

describe("W003 — stale proposed decision", () => {
  test("emitted for proposed decision older than 90 days", () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
    const ws = makeWorkspace([
      {
        kind: "decision",
        id: "d-1",
        title: "D",
        status: "proposed",
        date: old,
        addresses: [],
        loc: loc(1),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W003")).toBe(true);
  });

  test("NOT emitted for recent proposed decision", () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
    const ws = makeWorkspace([
      {
        kind: "decision",
        id: "d-1",
        title: "D",
        status: "proposed",
        date: recent,
        addresses: [],
        loc: loc(1),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W003")).toBe(false);
  });
});
