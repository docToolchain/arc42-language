import { describe, expect, test } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[]): Workspace {
  return { elements, parseErrors: [], documents: [], diagrams: [] };
}

function loc(line = 1) {
  return { file: "test.arc42.md", line };
}

function h022(ws: Workspace) {
  return validate(ws, buildIndex(ws)).filter((d) => d.code === "H022");
}

describe("H022 — root building block not reachable from any actor", () => {
  test("no diagnostic when a root block is directly reachable from an actor", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
    ]);
    expect(h022(ws)).toHaveLength(0);
  });

  test("fires when a root block provides an interface but no actor reaches it", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      // bb-site: provides an interface but no actor requires it (directly or transitively)
      {
        kind: "building-block",
        id: "bb-site",
        title: "Project Site",
        implements: [],
        requires: [],
        loc: loc(13),
      },
      { kind: "interface", id: "if-site", title: "Site", provider: "bb-site", loc: loc(17) },
    ]);
    const diags = h022(ws);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.code).toBe("H022");
    expect(diags[0]?.severity).toBe("hint");
    expect(diags[0]?.message).toContain("bb-site");
    expect(diags[0]?.message).not.toContain("bb-server");
  });

  test("no diagnostic when there are no actors (incomplete model, H008 covers it)", () => {
    const ws = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(1),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(5) },
    ]);
    expect(h022(ws)).toHaveLength(0);
  });

  test("does NOT fire for leaf blocks (blocks with a parent)", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      // child block: internal, not expected to have a direct actor path
      {
        kind: "building-block",
        id: "bb-child",
        title: "Child",
        parent: "bb-server",
        implements: [],
        requires: [],
        loc: loc(13),
      },
      { kind: "interface", id: "if-child", title: "Child IF", provider: "bb-child", loc: loc(17) },
    ]);
    expect(h022(ws)).toHaveLength(0);
  });

  test("does NOT fire for blocks with no interfaces (H004 covers that)", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      // bb-island: no interfaces at all — H004's territory, not H022
      {
        kind: "building-block",
        id: "bb-island",
        title: "Island",
        implements: [],
        requires: [],
        loc: loc(13),
      },
    ]);
    expect(h022(ws).some((d) => d.message.includes("bb-island"))).toBe(false);
  });

  test("fires for a root block that only consumes an interface but has no actor path to it", () => {
    // Real-world case: bb-site requires if-site-verdicts but no actor targets bb-site directly or transitively
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-verdicts",
        title: "Verdicts",
        implements: [],
        requires: [],
        loc: loc(13),
      },
      {
        kind: "interface",
        id: "if-verdicts",
        title: "Verdicts IF",
        provider: "bb-verdicts",
        loc: loc(17),
      },
      // bb-site only requires if-verdicts — no interface provided by bb-site, no actor reaches it
      {
        kind: "building-block",
        id: "bb-site",
        title: "Project Site",
        implements: [],
        requires: ["if-verdicts"],
        loc: loc(21),
      },
    ]);
    const diags = h022(ws);
    expect(diags.some((d) => d.message.includes("bb-site"))).toBe(true);
  });

  test("no diagnostic when root block is transitively reachable (actor → bb-a requires if-b → bb-b)", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-a"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-a",
        title: "A",
        implements: [],
        requires: ["if-b"],
        loc: loc(5),
      },
      { kind: "interface", id: "if-a", title: "A IF", provider: "bb-a", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-b",
        title: "B",
        implements: [],
        requires: [],
        loc: loc(13),
      },
      { kind: "interface", id: "if-b", title: "B IF", provider: "bb-b", loc: loc(17) },
    ]);
    expect(h022(ws)).toHaveLength(0);
  });

  test("diagnostic is on the block's source location", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-site",
        title: "Project Site",
        implements: [],
        requires: [],
        loc: { file: "05-building-blocks.arc42.md", line: 42 },
      },
      { kind: "interface", id: "if-site", title: "Site", provider: "bb-site", loc: loc(17) },
    ]);
    const diags = h022(ws);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.file).toBe("05-building-blocks.arc42.md");
    expect(diags[0]?.line).toBe(42);
  });

  test("multiple unreachable root blocks each get their own diagnostic", () => {
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-site",
        title: "Project Site",
        implements: [],
        requires: [],
        loc: loc(13),
      },
      { kind: "interface", id: "if-site", title: "Site", provider: "bb-site", loc: loc(17) },
      {
        kind: "building-block",
        id: "bb-docs",
        title: "Docs",
        implements: [],
        requires: [],
        loc: loc(21),
      },
      { kind: "interface", id: "if-docs", title: "Docs IF", provider: "bb-docs", loc: loc(25) },
    ]);
    const diags = h022(ws);
    expect(diags).toHaveLength(2);
    expect(diags.map((d) => d.message).some((m) => m.includes("bb-site"))).toBe(true);
    expect(diags.map((d) => d.message).some((m) => m.includes("bb-docs"))).toBe(true);
  });

  test("no diagnostic for consumer-only block that IS reachable from an actor", () => {
    // bb-site provides if-site-web (actor reaches it), and also consumes if-verdicts
    // Both bb-site (reachable via if-site-web) and bb-verdicts (reachable transitively) should be clean
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-visitor",
        title: "Visitor",
        type: "person",
        requires: ["if-site-web"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-site",
        title: "Project Site",
        implements: [],
        requires: ["if-verdicts"],
        loc: loc(5),
      },
      { kind: "interface", id: "if-site-web", title: "Site Web", provider: "bb-site", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-verdicts",
        title: "Verdicts",
        implements: [],
        requires: [],
        loc: loc(13),
      },
      {
        kind: "interface",
        id: "if-verdicts",
        title: "Verdicts IF",
        provider: "bb-verdicts",
        loc: loc(17),
      },
    ]);
    expect(h022(ws)).toHaveLength(0);
  });

  test("no diagnostic when unreachable blocks form a mutual-dependency cycle", () => {
    // A requires if-b (provided by B), B requires if-a (provided by A) — cycle, neither reachable from actor
    // Both should fire H022 (they participate in interfaces but no actor reaches them)
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-api"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-server",
        title: "Server",
        implements: [],
        requires: [],
        loc: loc(5),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-server", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-a",
        title: "A",
        implements: [],
        requires: ["if-b"],
        loc: loc(13),
      },
      { kind: "interface", id: "if-a", title: "A IF", provider: "bb-a", loc: loc(17) },
      {
        kind: "building-block",
        id: "bb-b",
        title: "B",
        implements: [],
        requires: ["if-a"],
        loc: loc(21),
      },
      { kind: "interface", id: "if-b", title: "B IF", provider: "bb-b", loc: loc(25) },
    ]);
    const diags = h022(ws);
    // Both bb-a and bb-b participate in interfaces but are unreachable — both should fire
    expect(diags.some((d) => d.message.includes("bb-a"))).toBe(true);
    expect(diags.some((d) => d.message.includes("bb-b"))).toBe(true);
    // BFS must not loop — cycle is safe because reachable set guards revisits
  });

  test("no diagnostic when cycle is reachable from an actor", () => {
    // Actor reaches bb-a, bb-a requires if-b (provided by bb-b), bb-b requires if-a (provided by bb-a)
    const ws = makeWorkspace([
      {
        kind: "actor",
        id: "actor-user",
        title: "User",
        type: "person",
        requires: ["if-a"],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-a",
        title: "A",
        implements: [],
        requires: ["if-b"],
        loc: loc(5),
      },
      { kind: "interface", id: "if-a", title: "A IF", provider: "bb-a", loc: loc(9) },
      {
        kind: "building-block",
        id: "bb-b",
        title: "B",
        implements: [],
        requires: ["if-a"],
        loc: loc(13),
      },
      { kind: "interface", id: "if-b", title: "B IF", provider: "bb-b", loc: loc(17) },
    ]);
    expect(h022(ws)).toHaveLength(0);
  });
});
