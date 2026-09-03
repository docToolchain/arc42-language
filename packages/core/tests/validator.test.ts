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

describe("validator", () => {
  test("E005 — parse error surfaced as E005 diagnostic", () => {
    const ws = makeWorkspace([], [{ message: "Missing 'id'", file: "f.arc42.md", line: 3 }]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const e005 = diags.filter((d) => d.code === "E005");
    expect(e005).toHaveLength(1);
    expect(e005[0]!.severity).toBe("error");
  });

  test("E001 — duplicate id", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-1", title: "Q2", priority: "low", loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E001")).toBe(true);
  });

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

  test("W012 and H012 activate only for deployment workspaces and exempt composites/groups", () => {
    const inactive = makeWorkspace([
      { kind: "building-block", id: "bb-api", title: "API", implements: [], loc: loc(1) },
    ]);
    expect(
      validate(inactive, buildIndex(inactive)).some((diagnostic) =>
        ["W012", "H012"].includes(diagnostic.code),
      ),
    ).toBe(false);

    const active = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-composite",
        title: "Composite",
        implements: [],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-leaf",
        title: "Leaf",
        parent: "bb-composite",
        implements: [],
        loc: loc(5),
      },
      { kind: "building-block", id: "bb-unmapped", title: "Unmapped", implements: [], loc: loc(9) },
      { kind: "deployment-node", id: "node-root", title: "Root", hosts: [], loc: loc(13) },
      {
        kind: "deployment-node",
        id: "node-empty",
        title: "Empty",
        hosts: [],
        parent: "node-root",
        loc: loc(17),
      },
    ]);
    const diagnostics = validate(active, buildIndex(active));
    expect(
      diagnostics.filter((diagnostic) => diagnostic.code === "W012").map((d) => d.message),
    ).toEqual([expect.stringContaining("bb-leaf"), expect.stringContaining("bb-unmapped")]);
    expect(
      diagnostics.filter((diagnostic) => diagnostic.code === "H012").map((d) => d.message),
    ).toEqual([expect.stringContaining("node-empty")]);
  });

  test("W012 accepts many-to-many deployment mappings", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-api", title: "API", implements: [], loc: loc(1) },
      {
        kind: "deployment-node",
        id: "node-a",
        title: "A",
        hosts: ["bb-api", "bb-api"],
        loc: loc(5),
      },
      {
        kind: "deployment-node",
        id: "node-b",
        title: "B",
        hosts: ["bb-api"],
        loc: loc(9),
      },
    ]);
    expect(
      validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "W012"),
    ).toHaveLength(0);
  });

  test("E003 — circular parent reference", () => {
    const ws = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-a",
        title: "A",
        parent: "bb-b",
        implements: [],
        loc: loc(1),
      },
      {
        kind: "building-block",
        id: "bb-b",
        title: "B",
        parent: "bb-a",
        implements: [],
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E003")).toBe(true);
  });

  test("E004 — interface.between references non-building-block", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["bb-1", "qg-1"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(true);
  });

  test("E004 — NOT emitted for valid actor↔building-block interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["actor-1", "bb-1"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(false);
  });

  test("E004 — emitted for actor↔actor interface (no building-block on either side)", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
      { kind: "actor", id: "actor-2", title: "Partner", type: "system", loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["actor-1", "actor-2"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E004")).toBe(true);
  });

  test("H008 — actor not connected to any interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H008")).toBe(true);
  });

  test("H008 — NOT emitted when actor is connected via interface", () => {
    const ws = makeWorkspace([
      { kind: "actor", id: "actor-1", title: "User", type: "person", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["actor-1", "bb-1"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H008")).toBe(false);
  });

  test("W001 — concept with no implementing building-block", () => {
    const ws = makeWorkspace([{ kind: "concept", id: "c-1", title: "Logging", loc: loc(1) }]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W001")).toBe(true);
  });

  test("W001 — NOT emitted when a building-block implements the concept", () => {
    const ws = makeWorkspace([
      { kind: "concept", id: "c-1", title: "Logging", loc: loc(1) },
      { kind: "building-block", id: "bb-1", title: "Logger", implements: ["c-1"], loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W001")).toBe(false);
  });

  test("W002 — isolated leaf building-block (has parent, no interface)", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-parent", title: "Parent", implements: [], loc: loc(1) },
      {
        kind: "building-block",
        id: "bb-1",
        title: "Lonely Child",
        parent: "bb-parent",
        implements: [],
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(true);
  });

  test("W002 — NOT emitted for root building-block (no parent) — checked by H004 instead", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-root", title: "Root", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(false);
  });

  test("W002 — NOT emitted when leaf building-block appears in an interface", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-parent", title: "Parent", implements: [], loc: loc(1) },
      {
        kind: "building-block",
        id: "bb-1",
        title: "A",
        parent: "bb-parent",
        implements: [],
        loc: loc(5),
      },
      {
        kind: "building-block",
        id: "bb-2",
        title: "B",
        parent: "bb-parent",
        implements: [],
        loc: loc(9),
      },
      { kind: "interface", id: "i-1", title: "I", between: ["bb-1", "bb-2"], loc: loc(13) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(false);
  });

  test("W003 — proposed decision older than 90 days", () => {
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

  test("W003 — NOT emitted for recent proposed decision", () => {
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

  test("H001 — decision without addresses", () => {
    const ws = makeWorkspace([
      { kind: "decision", id: "d-1", title: "D", status: "accepted", addresses: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H001")).toBe(true);
  });

  test("H002 — quality goal not addressed by any decision", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H002")).toBe(true);
  });

  test("H002 — NOT emitted when decision addresses the goal", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "decision",
        id: "d-1",
        title: "D",
        status: "accepted",
        addresses: ["qg-1"],
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H002")).toBe(false);
  });

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

  test("H010 — quality goal must be addressed by solution strategy, not decision", () => {
    const decisionOnly = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "decision",
        id: "d-1",
        title: "D",
        status: "accepted",
        addresses: ["qg-1"],
        loc: loc(5),
      },
    ]);
    const strategyLinked = makeWorkspace([
      ...decisionOnly.elements,
      {
        kind: "solution-strategy",
        id: "strategy-1",
        title: "Strategy",
        addresses: ["qg-1"],
        loc: loc(9),
      },
    ]);
    expect(validate(decisionOnly, buildIndex(decisionOnly)).some((d) => d.code === "H010")).toBe(
      true,
    );
    expect(
      validate(strategyLinked, buildIndex(strategyLinked)).some((d) => d.code === "H010"),
    ).toBe(false);
  });

  test("H003 — building-block without technology", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-1", title: "X", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H003")).toBe(true);
  });

  test("H003 — NOT emitted when technology is set", () => {
    const ws = makeWorkspace([
      {
        kind: "building-block",
        id: "bb-1",
        title: "X",
        technology: "Go",
        implements: [],
        loc: loc(1),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H003")).toBe(false);
  });

  test("W004 — block without preceding prose in section", () => {
    const content = `## My Section
:::building-block
id: bb-naked
title: Naked Block
technology: Go
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W004")).toBe(true);
  });

  test("W004 — NOT emitted when prose precedes the block", () => {
    const content = `## My Section

This block does something useful.

:::building-block
id: bb-described
title: Described Block
technology: Go
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W004")).toBe(false);
  });

  test("W004 — emitted for second block if no prose between blocks", () => {
    const content = `## Section

Some intro prose.

:::building-block
id: bb-first
title: First
technology: Go
:::
:::concept
id: c-naked
title: Naked Concept
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    const w004 = diags.filter((d) => d.code === "W004");
    expect(w004.length).toBeGreaterThanOrEqual(1);
    expect(w004.some((d) => d.message.includes("c-naked"))).toBe(true);
  });

  test("W005 — multiple blocks under one heading", () => {
    const content = `## Interfaces

These two interfaces are in the same section.

:::interface
id: if-a
title: Interface A
between: bb-1, bb-2
:::

:::interface
id: if-b
title: Interface B
between: bb-2, bb-3
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W005")).toBe(true);
  });

  test("W005 — NOT emitted when each heading has one block", () => {
    const content = `## Interface A

Connects bb-1 to bb-2.

:::interface
id: if-a
title: Interface A
between: bb-1, bb-2
:::

## Interface B

Connects bb-2 to bb-3.

:::interface
id: if-b
title: Interface B
between: bb-2, bb-3
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W005")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // W013 — quality-scenario no metric
  // -------------------------------------------------------------------------

  test("W013 — emitted when quality-scenario has no metric", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      { kind: "quality-scenario", id: "qs-1", title: "Scenario", quality: "qg-1", loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W013")).toBe(true);
  });

  test("W013 — NOT emitted when quality-scenario has a metric", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "quality-scenario",
        id: "qs-1",
        title: "Scenario",
        quality: "qg-1",
        metric: "p95 < 500ms",
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W013")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // H013 — quality-goal has no elaborating quality-scenario
  // -------------------------------------------------------------------------

  test("H013 — emitted when quality-goal has no quality-scenario", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H013")).toBe(true);
  });

  test("H013 — NOT emitted when quality-goal has at least one quality-scenario", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q", priority: "high", loc: loc(1) },
      {
        kind: "quality-scenario",
        id: "qs-1",
        title: "Scenario",
        quality: "qg-1",
        metric: "p95 < 500ms",
        loc: loc(5),
      },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H013")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // W006 / W007 — now count only priority:high goals
  // -------------------------------------------------------------------------

  test("W006 — fires when only 1 high-priority goal exists (low-priority not counted)", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-h", title: "High", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-l1", title: "Low1", priority: "low", loc: loc(5) },
      { kind: "quality-goal", id: "qg-l2", title: "Low2", priority: "low", loc: loc(9) },
      { kind: "quality-goal", id: "qg-l3", title: "Low3", priority: "low", loc: loc(13) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W006")).toBe(true);
  });

  test("W006 — NOT fired when 3 high-priority goals exist", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-h1", title: "High1", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-h2", title: "High2", priority: "high", loc: loc(5) },
      { kind: "quality-goal", id: "qg-h3", title: "High3", priority: "high", loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W006")).toBe(false);
  });

  test("W007 — fires when 6 high-priority goals exist", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q1", priority: "high", loc: loc(1) },
      { kind: "quality-goal", id: "qg-2", title: "Q2", priority: "high", loc: loc(5) },
      { kind: "quality-goal", id: "qg-3", title: "Q3", priority: "high", loc: loc(9) },
      { kind: "quality-goal", id: "qg-4", title: "Q4", priority: "high", loc: loc(13) },
      { kind: "quality-goal", id: "qg-5", title: "Q5", priority: "high", loc: loc(17) },
      { kind: "quality-goal", id: "qg-6", title: "Q6", priority: "high", loc: loc(21) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W007")).toBe(true);
  });

  test("W007 — NOT fired when 6 low-priority goals exist (only high counted)", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-1", title: "Q1", priority: "low", loc: loc(1) },
      { kind: "quality-goal", id: "qg-2", title: "Q2", priority: "low", loc: loc(5) },
      { kind: "quality-goal", id: "qg-3", title: "Q3", priority: "low", loc: loc(9) },
      { kind: "quality-goal", id: "qg-4", title: "Q4", priority: "low", loc: loc(13) },
      { kind: "quality-goal", id: "qg-5", title: "Q5", priority: "low", loc: loc(17) },
      { kind: "quality-goal", id: "qg-6", title: "Q6", priority: "low", loc: loc(21) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W007")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // H010 — now scoped to priority:high goals only
  // -------------------------------------------------------------------------

  test("H010 — NOT emitted for medium/low priority goals without strategy", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-med", title: "Medium", priority: "medium", loc: loc(1) },
      { kind: "quality-goal", id: "qg-low", title: "Low", priority: "low", loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H010")).toBe(false);
  });

  test("H010 — emitted for high-priority goal without strategy", () => {
    const ws = makeWorkspace([
      { kind: "quality-goal", id: "qg-high", title: "High", priority: "high", loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H010")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // W014 — quality goals not in descending priority order
  // -------------------------------------------------------------------------

  test("W014 — emitted when low-priority goal appears before high-priority", () => {
    const content = `## Low Goal

Some prose.

:::quality-goal
id: qg-low
title: Low Goal
priority: low
:::

## High Goal

Some prose.

:::quality-goal
id: qg-high
title: High Goal
priority: high
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(true);
    expect(diags.find((d) => d.code === "W014")!.message).toContain("qg-high");
  });

  test("W014 — emitted when medium-priority goal appears before high-priority", () => {
    const content = `## Medium Goal

Some prose.

:::quality-goal
id: qg-med
title: Medium Goal
priority: medium
:::

## High Goal

Some prose.

:::quality-goal
id: qg-high
title: High Goal
priority: high
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(true);
  });

  test("W014 — NOT emitted when goals are in correct order: high → medium → low", () => {
    const content = `## High Goal

Some prose.

:::quality-goal
id: qg-high
title: High Goal
priority: high
:::

## Medium Goal

Some prose.

:::quality-goal
id: qg-med
title: Medium Goal
priority: medium
:::

## Low Goal

Some prose.

:::quality-goal
id: qg-low
title: Low Goal
priority: low
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(false);
  });

  test("W014 — NOT emitted when goals all have same priority", () => {
    const content = `## High Goal A

Some prose.

:::quality-goal
id: qg-h1
title: High A
priority: high
:::

## High Goal B

Some prose.

:::quality-goal
id: qg-h2
title: High B
priority: high
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // W015 — missing or invalid arc42 chapter h1 heading
  // -------------------------------------------------------------------------

  test("W015 — NOT emitted for correct EN h1 on a numbered chapter file", () => {
    const content = `# Runtime View\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("W015 — NOT emitted for correct DE h1 on a numbered chapter file", () => {
    const content = `# Laufzeitsicht\n\nEtwas Inhalt.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("W015 — emitted when chapter file starts with h2 instead of h1", () => {
    const content = `## Runtime View\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
    expect(diags.find((d) => d.code === "W015")!.severity).toBe("warning");
  });

  test("W015 — emitted when h1 text is not a recognized arc42 chapter title", () => {
    const content = `# My Custom Title\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
  });

  test("W015 — emitted when h1 matches the wrong chapter number", () => {
    // File is chapter 06 but heading says chapter 01's title
    const content = `# Introduction and Goals\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
  });

  test("W015 — emitted when chapter file has no headings at all", () => {
    const content = `Just some prose with no heading.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
  });

  test("W015 — NOT emitted for files without a numeric chapter prefix", () => {
    const content = `## Some Section\n\nContent without an h1.`;
    const ws = workspaceFromContent("building-blocks.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("W015 — NOT emitted for files not ending in .arc42.md", () => {
    const content = `## Some Section\n\nContent.`;
    const ws = workspaceFromContent("06-runtime-view.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("W015 — title matching is case-insensitive", () => {
    const content = `# runtime view\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("W015 — all 12 EN chapter titles are accepted", () => {
    const chapters: [string, string][] = [
      ["01-introduction-and-goals.arc42.md", "# Introduction and Goals"],
      ["02-architecture-constraints.arc42.md", "# Architecture Constraints"],
      ["03-system-scope-and-context.arc42.md", "# System Scope and Context"],
      ["04-solution-strategy.arc42.md", "# Solution Strategy"],
      ["05-building-block-view.arc42.md", "# Building Block View"],
      ["06-runtime-view.arc42.md", "# Runtime View"],
      ["07-deployment-view.arc42.md", "# Deployment View"],
      ["08-concepts.arc42.md", "# Cross-cutting Concepts"],
      ["09-decisions.arc42.md", "# Architecture Decisions"],
      ["10-quality-requirements.arc42.md", "# Quality Requirements"],
      ["11-risks.arc42.md", "# Risks and Technical Debt"],
      ["12-glossary.arc42.md", "# Glossary"],
    ];
    for (const [file, heading] of chapters) {
      const ws = workspaceFromContent(file, `${heading}\n\nSome content.`);
      const w015 = validate(ws, buildIndex(ws)).filter((d) => d.code === "W015");
      expect(w015, `Expected no W015 for ${file} with heading "${heading}"`).toHaveLength(0);
    }
  });

  test("W015 — all 12 DE chapter titles are accepted", () => {
    const chapters: [string, string][] = [
      ["01-einfuehrung.arc42.md", "# Einführung und Ziele"],
      ["02-randbedingungen.arc42.md", "# Randbedingungen"],
      ["03-kontext.arc42.md", "# Systemabgrenzung und Kontext"],
      ["04-loesungsstrategie.arc42.md", "# Lösungsstrategie"],
      ["05-bausteinsicht.arc42.md", "# Bausteinsicht"],
      ["06-laufzeitsicht.arc42.md", "# Laufzeitsicht"],
      ["07-verteilungssicht.arc42.md", "# Verteilungssicht"],
      ["08-konzepte.arc42.md", "# Querschnittliche Konzepte"],
      ["09-entscheidungen.arc42.md", "# Architekturentscheidungen"],
      ["10-qualitaet.arc42.md", "# Qualitätsanforderungen"],
      ["11-risiken.arc42.md", "# Risiken und technische Schulden"],
      ["12-glossar.arc42.md", "# Glossar"],
    ];
    for (const [file, heading] of chapters) {
      const ws = workspaceFromContent(file, `${heading}\n\nEtwas Inhalt.`);
      const w015 = validate(ws, buildIndex(ws)).filter((d) => d.code === "W015");
      expect(w015, `Expected no W015 for ${file} with heading "${heading}"`).toHaveLength(0);
    }
  });
});
