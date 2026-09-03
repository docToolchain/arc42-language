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

describe("H009 — solution strategy without addresses", () => {
  test("emitted when solution strategy has no addresses", () => {
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

  test("NOT emitted for an addressed strategy", () => {
    const addressed = makeWorkspace([
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: ["qg-1"],
        loc: loc(1),
      },
    ]);
    expect(validate(addressed, buildIndex(addressed)).some((d) => d.code === "H009")).toBe(false);
  });

  test("NOT emitted when there are duplicate strategies (E007 fires instead)", () => {
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
    const codes = validate(duplicate, buildIndex(duplicate)).map((d) => d.code);
    expect(codes).toContain("E007");
    expect(codes).not.toContain("H009");
  });
});
