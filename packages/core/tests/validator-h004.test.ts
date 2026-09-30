import { describe, expect, test } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace, Element } from "../src/model/types.ts";

function makeWorkspace(elements: Element[]): Workspace {
  return { elements, parseErrors: [], documents: [], diagrams: [] };
}

const loc = (line = 1) => ({ file: "test.arc42.md", line });

const block = (id: string, requires: string[] = [], parent?: string): Element => ({
  kind: "building-block",
  id,
  title: id,
  implements: [],
  requires,
  ...(parent ? { parent } : {}),
  loc: loc(),
});

const iface = (id: string, provider: string): Element => ({
  kind: "interface",
  id,
  title: id,
  provider,
  loc: loc(),
});

function h004(elements: Element[]): string[] {
  const ws = makeWorkspace(elements);
  return validate(ws, buildIndex(ws))
    .filter((d) => d.code === "H004")
    .map((d) => d.message);
}

describe("H004 — building block not referenced by any interface", () => {
  test("fires for a root block without any interface", () => {
    expect(h004([block("bb-island")])).toEqual([
      "Building block 'bb-island' is not referenced by any interface — consider connecting it or removing it (chapter 5)",
    ]);
  });

  test("no diagnostic for a root block that provides an interface", () => {
    expect(h004([block("bb-server"), iface("if-api", "bb-server")])).toEqual([]);
  });

  test("no diagnostic for a root block that requires an interface", () => {
    expect(
      h004([block("bb-client", ["if-api"]), block("bb-server"), iface("if-api", "bb-server")]),
    ).toEqual([]);
  });

  test("a layer whose interfaces sit on its parts is told to expose them on its black box (#99)", () => {
    expect(
      h004([
        block("bb-cli", ["if-parser"]),
        iface("if-cli", "bb-cli"),
        block("bb-ingestion"),
        block("bb-eml-parser", [], "bb-ingestion"),
        iface("if-parser", "bb-eml-parser"),
      ]),
    ).toEqual([
      "Building block 'bb-ingestion' has no interface of its own, but its parts have: if-parser (provided by bb-eml-parser) — model the interface on 'bb-ingestion' as its black-box interface, realized by the part, so level 1 shows how it collaborates (chapter 5)",
    ]);
  });

  test("names interfaces deeper in the decomposition and those its parts require", () => {
    const [message] = h004([
      block("bb-root"),
      block("bb-mid", ["if-store"], "bb-root"),
      block("bb-leaf", [], "bb-mid"),
      iface("if-leaf", "bb-leaf"),
      block("bb-store"),
      iface("if-store", "bb-store"),
    ]);
    expect(message).toContain("if-leaf (provided by bb-leaf), if-store (required by bb-mid)");
  });

  test("shortens a long list", () => {
    const parts = ["a", "b", "c", "d", "e"].flatMap((name) => [
      block(`bb-${name}`, [], "bb-root"),
      iface(`if-${name}`, `bb-${name}`),
    ]);
    expect(h004([block("bb-root"), ...parts])[0]).toContain(
      "if-a (provided by bb-a), if-b (provided by bb-b), if-c (provided by bb-c), and 2 more",
    );
  });

  test("a layer whose parts have no interfaces either gets the plain hint", () => {
    expect(h004([block("bb-layer"), block("bb-part", [], "bb-layer")])).toEqual([
      "Building block 'bb-layer' is not referenced by any interface — consider connecting it or removing it (chapter 5)",
    ]);
  });

  test("parts never get the hint themselves", () => {
    expect(
      h004([block("bb-root"), iface("if-root", "bb-root"), block("bb-part", [], "bb-root")]),
    ).toEqual([]);
  });
});
