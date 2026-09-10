import { describe, expect, test } from "vite-plus/test";
import { getElementsFromDocuments, type ElementView, type WorkspaceView } from "@arc42/core";
import { builtinGetRenderers, rendererById } from "../src/renderer/index.ts";
import { getElements } from "@arc42/workspace-fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const fixtureDir = join(fileURLToPath(import.meta.url), "../../core/src/__fixtures__/mini-arch");

describe("filesystem workspace queries", () => {
  test("loads a workspace with resolved relationships through the adapter API", async () => {
    const result = (await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    })) as WorkspaceView;

    expect(result.kind).toBe("workspace");
    expect(result.elements.some((element) => element.id === "qg-perf")).toBe(true);
    expect(result.edges).toContainEqual({
      from: "dec-rest",
      to: "qg-perf",
      relation: "addresses",
    });
  });

  test("returns resolved incoming and outgoing references for an element", async () => {
    const result = (await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "dec-rest" },
    })) as ElementView;

    expect(result.element.title).toBe("Use REST for external APIs");
    expect(result.refsFrom).toContainEqual(expect.objectContaining({ id: "qg-perf" }));
    expect(result.refsTo).toEqual([]);
  });
});

describe("public core renderers", () => {
  test("registry exposes all supported output formats", () => {
    expect(builtinGetRenderers.map((renderer) => renderer.meta.id)).toEqual([
      "text",
      "json",
      "markdown",
    ]);
    expect(rendererById.get("text")?.meta.mimeType).toBe("text/plain");
    expect(rendererById.get("json")?.meta.mimeType).toBe("application/json");
    expect(rendererById.get("markdown")?.meta.mimeType).toBe("text/markdown");
  });

  test("text renderer produces chapter content for an adapter query", async () => {
    const result = await getElements({ dir: fixtureDir, query: { kind: "workspace" } });
    const output = rendererById.get("text")!.render(result);

    expect(output).toContain("Building Blocks");
    expect(output).toContain("Architecture Decisions");
    expect(output).toContain("dec-rest");
  });

  test("JSON and Markdown renderers produce consumable workspace output", async () => {
    const result = await getElements({ dir: fixtureDir, query: { kind: "workspace" } });
    const json = JSON.parse(rendererById.get("json")!.render(result)) as WorkspaceView;
    const markdown = rendererById.get("markdown")!.render(result);

    expect(json.elements.some((element) => element.id === "qg-perf")).toBe(true);
    expect(json.edges).toContainEqual({
      from: "dec-rest",
      to: "qg-perf",
      relation: "addresses",
    });
    expect(markdown).toMatch(/^# arc42 Architecture/);
    expect(markdown).toContain("### dec-rest");
  });

  test("public core query API renders an in-memory element without filesystem access", () => {
    const result = getElementsFromDocuments({
      documents: [
        {
          filePath: "architecture.arc42.md",
          nodes: [],
        },
      ],
      query: { kind: "workspace" },
    });

    expect(rendererById.get("json")!.render(result)).toContain('"elements": []');
  });
});
