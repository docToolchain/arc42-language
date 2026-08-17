import { expect, test, describe } from "vite-plus/test";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace } from "../src/model/types.ts";

describe("buildIndex", () => {
  test("byId contains all elements", () => {
    const ws: Workspace = {
      elements: [
        { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: { file: "f", line: 1 } },
        { kind: "decision", id: "d-1", title: "D", status: "accepted", addresses: ["qg-1"], loc: { file: "f", line: 5 } },
      ],
      parseErrors: [],
    };
    const idx = buildIndex(ws);
    expect(idx.byId.has("qg-1")).toBe(true);
    expect(idx.byId.has("d-1")).toBe(true);
  });

  test("decision.addresses populates both refsFrom and refsTo", () => {
    const ws: Workspace = {
      elements: [
        { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: { file: "f", line: 1 } },
        { kind: "decision", id: "d-1", title: "D", status: "accepted", addresses: ["qg-1"], loc: { file: "f", line: 5 } },
      ],
      parseErrors: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("d-1")).toContain("qg-1");
    expect(idx.refsTo.get("qg-1")).toContain("d-1");
  });

  test("element with no references appears in byId but not refsFrom", () => {
    const ws: Workspace = {
      elements: [
        { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: { file: "f", line: 1 } },
      ],
      parseErrors: [],
    };
    const idx = buildIndex(ws);
    expect(idx.byId.has("qg-1")).toBe(true);
    expect(idx.refsFrom.has("qg-1")).toBe(false);
  });

  test("building-block parent + implements both indexed", () => {
    const ws: Workspace = {
      elements: [
        { kind: "building-block", id: "bb-child", title: "Child", parent: "bb-parent", implements: ["c-1"], loc: { file: "f", line: 1 } },
        { kind: "building-block", id: "bb-parent", title: "Parent", implements: [], loc: { file: "f", line: 5 } },
        { kind: "concept", id: "c-1", title: "C", loc: { file: "f", line: 9 } },
      ],
      parseErrors: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("bb-child")).toContain("bb-parent");
    expect(idx.refsFrom.get("bb-child")).toContain("c-1");
    expect(idx.refsTo.get("bb-parent")).toContain("bb-child");
  });
});
