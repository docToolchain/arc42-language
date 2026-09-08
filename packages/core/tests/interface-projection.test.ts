import { describe, expect, test } from "vite-plus/test";
import { buildIndex } from "../src/resolver/index.ts";
import type { Workspace } from "../src/model/types.ts";
import { validate } from "../src/validator/index.ts";

const loc = (line: number) => ({ file: "projection.arc42.md", line });

function workspace(): Workspace {
  return {
    elements: [
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
        id: "bb-client",
        title: "Client",
        implements: [],
        requires: ["if-api"],
        loc: loc(2),
      },
      {
        kind: "building-block",
        id: "bb-api",
        title: "API",
        implements: [],
        requires: [],
        loc: loc(3),
      },
      { kind: "interface", id: "if-api", title: "API", provider: "bb-api", loc: loc(4) },
    ],
    parseErrors: [],
    documents: [],
    diagrams: [],
  };
}

describe("derived interface projection", () => {
  test("keeps multiple consumers and canonical edges separate", () => {
    const index = buildIndex(workspace());

    expect(index.interfaceEdges).toEqual(
      expect.arrayContaining([
        { consumer: "actor-user", provider: "bb-api", interface: "if-api" },
        { consumer: "bb-client", provider: "bb-api", interface: "if-api" },
      ]),
    );
    expect(index.interfaceEdges).toHaveLength(2);
    expect(index.edges).toContainEqual({ from: "bb-api", to: "if-api", relation: "provides" });
    expect(index.edges).toContainEqual({ from: "actor-user", to: "if-api", relation: "requires" });
    expect(index.edges).toContainEqual({ from: "bb-client", to: "if-api", relation: "requires" });
  });

  test("rejects a building block requiring its own interface", () => {
    const ws = workspace();
    const api = ws.elements.find((element) => element.id === "bb-api");
    if (api?.kind !== "building-block") throw new Error("missing API fixture");
    api.requires = ["if-api"];

    expect(validate(ws, buildIndex(ws)).some((diagnostic) => diagnostic.code === "E015")).toBe(
      true,
    );
  });
});
