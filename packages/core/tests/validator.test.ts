import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[], parseErrors: Workspace["parseErrors"] = []): Workspace {
  return { elements, parseErrors };
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
      { kind: "building-block", id: "bb-1", title: "X", parent: "bb-missing", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "E002")).toBe(true);
  });

  test("E003 — circular parent reference", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-a", title: "A", parent: "bb-b", implements: [], loc: loc(1) },
      { kind: "building-block", id: "bb-b", title: "B", parent: "bb-a", implements: [], loc: loc(5) },
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

  test("W001 — concept with no implementing building-block", () => {
    const ws = makeWorkspace([
      { kind: "concept", id: "c-1", title: "Logging", loc: loc(1) },
    ]);
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

  test("W002 — isolated building-block", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-1", title: "Lonely", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(true);
  });

  test("W002 — NOT emitted when building-block appears in an interface", () => {
    const ws = makeWorkspace([
      { kind: "building-block", id: "bb-1", title: "A", implements: [], loc: loc(1) },
      { kind: "building-block", id: "bb-2", title: "B", implements: [], loc: loc(5) },
      { kind: "interface", id: "i-1", title: "I", between: ["bb-1", "bb-2"], loc: loc(9) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W002")).toBe(false);
  });

  test("W003 — proposed decision older than 90 days", () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
    const ws = makeWorkspace([
      { kind: "decision", id: "d-1", title: "D", status: "proposed", date: old, addresses: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W003")).toBe(true);
  });

  test("W003 — NOT emitted for recent proposed decision", () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
    const ws = makeWorkspace([
      { kind: "decision", id: "d-1", title: "D", status: "proposed", date: recent, addresses: [], loc: loc(1) },
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
      { kind: "decision", id: "d-1", title: "D", status: "accepted", addresses: ["qg-1"], loc: loc(5) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H002")).toBe(false);
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
      { kind: "building-block", id: "bb-1", title: "X", technology: "Go", implements: [], loc: loc(1) },
    ]);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "H003")).toBe(false);
  });
});
