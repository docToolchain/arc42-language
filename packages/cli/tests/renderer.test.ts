import { describe, expect, test } from "vite-plus/test";
import {
  getElementsFromDocuments,
  parseArchitectureDocument,
  type ElementView,
  type WorkspaceView,
} from "@arc42/core";
import { JsonGetRenderer } from "../src/renderer/json.ts";
import { MarkdownGetRenderer, toSlug } from "../src/renderer/markdown.ts";
import { TextGetRenderer } from "../src/renderer/text.ts";

function documents() {
  return [
    parseArchitectureDocument(
      "architecture.arc42.md",
      `# Architecture

## Low Priority

Important later.

:::quality-goal
id: qg-low
title: Low Priority
priority: low
:::

## High Priority

Critical.

:::quality-goal
id: qg-high
title: High Priority
priority: high
:::

## API

Handles requests.

:::building-block
id: bb-api
title: API
technology: TypeScript
:::

## Client

Calls the API.

:::building-block
id: bb-client
title: Client
requires: if-api
:::

## API Contract

The API contract.

:::interface
id: if-api
title: API Contract
provider: bb-api
protocol: HTTP
:::
`,
    ),
  ];
}

describe("renderer and query behavior", () => {
  test("sorts workspace elements by canonical kind and quality priority", () => {
    const result = getElementsFromDocuments({
      documents: documents(),
      query: { kind: "workspace" },
    }) as WorkspaceView;

    expect(
      result.elements.filter((element) => element.kind === "quality-goal").map((e) => e.id),
    ).toEqual(["qg-high", "qg-low"]);
    expect(result.edges).toContainEqual({ from: "bb-api", to: "if-api", relation: "provides" });
    expect(result.edges).toContainEqual({ from: "bb-client", to: "if-api", relation: "requires" });
  });

  test("applies workspace type filters without dropping reference edges", () => {
    const result = getElementsFromDocuments({
      documents: documents(),
      query: { kind: "workspace", typeFilter: "building-block" },
    }) as WorkspaceView;

    expect(result.elements.map((element) => element.id)).toEqual(["bb-api", "bb-client"]);
    expect(result.edges).toContainEqual({ from: "bb-client", to: "if-api", relation: "requires" });
    expect(result.typeFilter).toBe("building-block");
  });

  test("resolves outgoing and incoming references for an element", () => {
    const result = getElementsFromDocuments({
      documents: documents(),
      query: { kind: "element", id: "if-api" },
    }) as ElementView;

    expect(result.refsFrom.map((ref) => ref.id)).toEqual([]);
    expect(result.refsTo.map((ref) => ref.id)).toEqual(
      expect.arrayContaining(["bb-api", "bb-client"]),
    );
  });

  test("returns null for an unknown element", () => {
    expect(
      getElementsFromDocuments({
        documents: documents(),
        query: { kind: "element", id: "missing" },
      }),
    ).toBeNull();
  });

  test("renders provider and requirement fields in text and JSON output", () => {
    const result = getElementsFromDocuments({
      documents: documents(),
      query: { kind: "workspace", typeFilter: "building-block" },
    });
    const text = new TextGetRenderer().render(result);
    const json = JSON.parse(new JsonGetRenderer().render(result)) as WorkspaceView;

    expect(text).toContain("requires: if-api");
    expect(json.edges).toContainEqual({ from: "bb-api", to: "if-api", relation: "provides" });
  });

  test("renders prose, navigable locations, and references in Markdown", () => {
    const element = getElementsFromDocuments({
      documents: documents(),
      query: { kind: "element", id: "bb-client" },
    });
    const markdown = new MarkdownGetRenderer().render(element);

    expect(markdown).toContain("Calls the API.");
    expect(markdown).toContain("[if-api](architecture.arc42.md#api-contract) — interface");
    expect(markdown).toContain("*location: [architecture.arc42.md:");
  });

  test("creates stable heading slugs for links", () => {
    expect(toSlug("API Contract (v2)")).toBe("api-contract-v2");
    expect(toSlug("!!!")).toBe("");
  });
});
