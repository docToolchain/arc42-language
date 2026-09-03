import { expect, test, describe } from "vite-plus/test";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace } from "../src/model/types.ts";

describe("buildIndex", () => {
  test("byId contains all elements", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "quality-goal",
          id: "qg-1",
          title: "Q",
          priority: "high",
          loc: { file: "f", line: 1 },
        },
        {
          kind: "decision",
          id: "d-1",
          title: "D",
          status: "accepted",
          addresses: ["qg-1"],
          loc: { file: "f", line: 5 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.byId.has("qg-1")).toBe(true);
    expect(idx.byId.has("d-1")).toBe(true);
  });

  test("decision.addresses populates both refsFrom and refsTo", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "quality-goal",
          id: "qg-1",
          title: "Q",
          priority: "high",
          loc: { file: "f", line: 1 },
        },
        {
          kind: "decision",
          id: "d-1",
          title: "D",
          status: "accepted",
          addresses: ["qg-1"],
          loc: { file: "f", line: 5 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("d-1")).toContain("qg-1");
    expect(idx.refsTo.get("qg-1")).toContain("d-1");
  });

  test("solution-strategy.addresses populates both refsFrom and refsTo", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "quality-goal",
          id: "qg-1",
          title: "Q",
          priority: "high",
          loc: { file: "f", line: 1 },
        },
        {
          kind: "solution-strategy",
          id: "strategy-1",
          title: "Strategy",
          addresses: ["qg-1"],
          loc: { file: "f", line: 5 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("strategy-1")).toContain("qg-1");
    expect(idx.refsTo.get("qg-1")).toContain("strategy-1");
  });

  test("element with no references appears in byId but not refsFrom", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "quality-goal",
          id: "qg-1",
          title: "Q",
          priority: "high",
          loc: { file: "f", line: 1 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.byId.has("qg-1")).toBe(true);
    expect(idx.refsFrom.has("qg-1")).toBe(false);
  });

  test("building-block parent + implements both indexed", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "building-block",
          id: "bb-child",
          title: "Child",
          parent: "bb-parent",
          implements: ["c-1"],
          loc: { file: "f", line: 1 },
        },
        {
          kind: "building-block",
          id: "bb-parent",
          title: "Parent",
          implements: [],
          loc: { file: "f", line: 5 },
        },
        { kind: "concept", id: "c-1", title: "C", loc: { file: "f", line: 9 } },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("bb-child")).toContain("bb-parent");
    expect(idx.refsFrom.get("bb-child")).toContain("c-1");
    expect(idx.refsTo.get("bb-parent")).toContain("bb-child");
  });

  test("runtime-scenario.involves populates both refsFrom and refsTo", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "runtime-scenario",
          id: "scenario-checkout",
          title: "Checkout",
          involves: ["bb-api"],
          loc: { file: "f", line: 1 },
        },
        {
          kind: "building-block",
          id: "bb-api",
          title: "API",
          implements: [],
          loc: { file: "f", line: 5 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("scenario-checkout")).toContain("bb-api");
    expect(idx.refsTo.get("bb-api")).toContain("scenario-checkout");
  });

  test("deployment-node parent and hosts populate both directions", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "deployment-node",
          id: "node-child",
          title: "Child",
          parent: "node-root",
          hosts: ["bb-api", "bb-db"],
          loc: { file: "f", line: 1 },
        },
        {
          kind: "deployment-node",
          id: "node-root",
          title: "Root",
          hosts: [],
          loc: { file: "f", line: 5 },
        },
        {
          kind: "building-block",
          id: "bb-api",
          title: "API",
          implements: [],
          loc: { file: "f", line: 9 },
        },
        {
          kind: "building-block",
          id: "bb-db",
          title: "DB",
          implements: [],
          loc: { file: "f", line: 13 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("node-child")).toEqual(["node-root", "bb-api", "bb-db"]);
    expect(idx.refsTo.get("bb-api")).toEqual(["node-child"]);
  });

  test("quality-scenario.quality populates both refsFrom and refsTo", () => {
    const ws: Workspace = {
      elements: [
        {
          kind: "quality-goal",
          id: "qg-perf",
          title: "Performance",
          priority: "high",
          loc: { file: "f", line: 1 },
        },
        {
          kind: "quality-scenario",
          id: "qs-perf-1",
          title: "Perf under load",
          quality: "qg-perf",
          loc: { file: "f", line: 5 },
        },
      ],
      parseErrors: [],
      documents: [],
      diagrams: [],
    };
    const idx = buildIndex(ws);
    expect(idx.refsFrom.get("qs-perf-1")).toContain("qg-perf");
    expect(idx.refsTo.get("qg-perf")).toContain("qs-perf-1");
  });
});
