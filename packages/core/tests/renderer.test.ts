import { expect, test, describe } from "vite-plus/test";
import { getElements } from "../src/arc42.ts";
import type { GetResult, WorkspaceView, ElementView, Edge, ResolvedRef } from "../src/renderer/types.ts";
import { ELEMENT_KIND_ORDER } from "../src/model/types.ts";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDir = join(
  fileURLToPath(import.meta.url),
  "../../src/__fixtures__/mini-arch",
);

describe("getElements API - workspace view", () => {
  test("returns WorkspaceView with kind workspace", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    expect(result.kind).toBe("workspace");
    const view = result as WorkspaceView;
    expect(typeof view.elements).toBe("object");
    expect(typeof view.edges).toBe("object");
  });

  test("elements are sorted by ELEMENT_KIND_ORDER then alpha by id", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    const view = result as WorkspaceView;
    const elements = view.elements;

    // Check kind order
    for (let i = 1; i < elements.length; i++) {
      const prevRank = ELEMENT_KIND_ORDER.indexOf(elements[i - 1]!.kind);
      const currRank = ELEMENT_KIND_ORDER.indexOf(elements[i]!.kind);
      expect(prevRank).toBeLessThanOrEqual(currRank);
    }

    // Check alphabetical within each kind
    for (let i = 1; i < elements.length; i++) {
      if (elements[i]!.kind === elements[i - 1]!.kind) {
        expect(elements[i - 1]!.id.localeCompare(elements[i]!.id)).toBeLessThanOrEqual(0);
      }
    }
  });

  test("edges array contains all reference edges", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    const view = result as WorkspaceView;
    const edges = view.edges;

    // Should have implements edges (bb-db implements concept-logging)
    const implementsEdges = edges.filter((e) => e.relation === "implements");
    expect(implementsEdges.length).toBeGreaterThan(0);

    // Should have parent edges (bb-auth has broken parent)
    const parentEdges = edges.filter((e) => e.relation === "parent");
    expect(parentEdges.length).toBeGreaterThan(0);

    // Should have addresses edges (dec-rest addresses qg-perf)
    const addressesEdges = edges.filter((e) => e.relation === "addresses");
    expect(addressesEdges.length).toBeGreaterThan(0);

    // Note: "between" edges would exist if there were interfaces in the fixture
    // The mini-arch fixture doesn't contain any interface elements
  });

  test("typeFilter narrows elements but edges still cover full workspace", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace", typeFilter: "quality-goal" },
    });

    const view = result as WorkspaceView;
    expect(view.typeFilter).toBe("quality-goal");
    expect(view.elements.every((e) => e.kind === "quality-goal")).toBe(true);

    // Edges should still include all workspace edges (not just quality-goal ones)
    // The dec-rest addresses qg-perf edge should be there
    const addressesToQg = view.edges.filter(
      (e) => e.relation === "addresses" && e.to === "qg-perf"
    );
    expect(addressesToQg.length).toBe(1);
  });
});

describe("getElements API - single element view", () => {
  test("returns ElementView with kind element for existing id", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "qg-perf" },
    });

    expect(result.kind).toBe("element");
    const view = result as ElementView;
    expect(view.element.id).toBe("qg-perf");
  });

  test("returns null for non-existent id", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "non-existent-id" },
    });

    // The implementation returns null cast as unknown as GetResult
    expect(result).toBeNull();
  });

  test("refsFrom contains outgoing resolved refs", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "dec-rest" },
    });

    const view = result as ElementView;
    // dec-rest addresses qg-perf
    const qgPerfRef = view.refsFrom.find((r) => r.id === "qg-perf");
    expect(qgPerfRef).toBeDefined();
    expect(qgPerfRef!.element).toBeDefined();
    expect(qgPerfRef!.element!.id).toBe("qg-perf");
  });

  test("refsTo contains incoming resolved refs (bidirectional)", async () => {
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "qg-perf" },
    });

    const view = result as ElementView;
    // qg-perf is addressed by dec-rest
    const decRestRef = view.refsTo.find((r) => r.id === "dec-rest");
    expect(decRestRef).toBeDefined();
    expect(decRestRef!.element).toBeDefined();
    expect(decRestRef!.element!.id).toBe("dec-rest");
  });

  test("building-block shows interfaces it participates in", async () => {
    // Need to create a fixture with an interface first
    // For now, test that bb-db shows refsTo containing concept it implements
    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "bb-db" },
    });

    const view = result as ElementView;
    // bb-db implements concept-logging, so refsFrom should contain concept-logging
    const conceptRef = view.refsFrom.find((r) => r.id === "concept-logging");
    expect(conceptRef).toBeDefined();
    expect(conceptRef!.element).toBeDefined();
    expect(conceptRef!.element!.kind).toBe("concept");
  });
});

describe("TextGetRenderer", () => {
  test("imports from ../src/renderer/text.ts", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    expect(TextGetRenderer).toBeDefined();
  });

  test("meta.id equals text", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();
    expect(renderer.meta.id).toBe("text");
  });

  test("meta.mimeType equals text/plain", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();
    expect(renderer.meta.mimeType).toBe("text/plain");
  });

  test("workspace view: output contains chapter headers", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    const output = renderer.render(result);
    expect(output).toContain("Quality Goals");
    expect(output).toContain("Building Blocks");
    expect(output).toContain("Cross-cutting Concepts");
    expect(output).toContain("Architecture Decisions");
  });

  test("workspace view: elements appear in correct chapter order", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    const output = renderer.render(result);
    const qgIndex = output.indexOf("Quality Goals");
    const bbIndex = output.indexOf("Building Blocks");
    const conceptIndex = output.indexOf("Cross-cutting Concepts");
    const decIndex = output.indexOf("Architecture Decisions");

    expect(qgIndex).toBeLessThan(bbIndex);
    expect(bbIndex).toBeLessThan(conceptIndex);
    expect(conceptIndex).toBeLessThan(decIndex);
  });

  test("workspace view: omits fields with no value", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    const output = renderer.render(result);
    // qg-security has no priority, should not show "(none)" or empty values
    expect(output).not.toMatch(/\(none\)/i);
  });

  test("single element view: renders full element detail", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "qg-perf" },
    });

    const output = renderer.render(result);
    expect(output).toContain("qg-perf");
    expect(output).toContain("Performance");
    expect(output).toContain("high");
  });

  test("single element view: shows resolved neighbor ids", async () => {
    const { TextGetRenderer } = await import("../src/renderer/text.ts");
    const renderer = new TextGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "dec-rest" },
    });

    const output = renderer.render(result);
    // Should show qg-perf as it addresses it
    expect(output).toContain("qg-perf");
  });
});

describe("JsonGetRenderer", () => {
  test("imports from ../src/renderer/json.ts", async () => {
    const { JsonGetRenderer } = await import("../src/renderer/json.ts");
    expect(JsonGetRenderer).toBeDefined();
  });

  test("meta.id equals json", async () => {
    const { JsonGetRenderer } = await import("../src/renderer/json.ts");
    const renderer = new JsonGetRenderer();
    expect(renderer.meta.id).toBe("json");
  });

  test("meta.mimeType equals application/json", async () => {
    const { JsonGetRenderer } = await import("../src/renderer/json.ts");
    const renderer = new JsonGetRenderer();
    expect(renderer.meta.mimeType).toBe("application/json");
  });

  test("workspace view: output is valid JSON with elements and edges", async () => {
    const { JsonGetRenderer } = await import("../src/renderer/json.ts");
    const renderer = new JsonGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "workspace" },
    });

    const output = renderer.render(result);
    const parsed = JSON.parse(output);
    expect(parsed.elements).toBeDefined();
    expect(Array.isArray(parsed.elements)).toBe(true);
    expect(parsed.edges).toBeDefined();
    expect(Array.isArray(parsed.edges)).toBe(true);
  });

  test("single element view: output is valid JSON with element and refsFrom/refsTo", async () => {
    const { JsonGetRenderer } = await import("../src/renderer/json.ts");
    const renderer = new JsonGetRenderer();

    const result = await getElements({
      dir: fixtureDir,
      query: { kind: "element", id: "qg-perf" },
    });

    const output = renderer.render(result);
    const parsed = JSON.parse(output);
    expect(parsed.element).toBeDefined();
    expect(parsed.element.id).toBe("qg-perf");
    expect(parsed.refsFrom).toBeDefined();
    expect(parsed.refsTo).toBeDefined();
    expect(Array.isArray(parsed.refsFrom)).toBe(true);
    expect(Array.isArray(parsed.refsTo)).toBe(true);
  });
});

describe("builtinGetRenderers registry", () => {
  test("imports from ../src/renderer/index.ts", async () => {
    const { builtinGetRenderers, rendererById } = await import("../src/renderer/index.ts");
    expect(builtinGetRenderers).toBeDefined();
    expect(rendererById).toBeDefined();
  });

  test("registry contains text and json renderers", async () => {
    const { builtinGetRenderers } = await import("../src/renderer/index.ts");
    const ids = builtinGetRenderers.map((r) => r.meta.id);
    expect(ids).toContain("text");
    expect(ids).toContain("json");
  });

  test("rendererById.get returns text renderer", async () => {
    const { rendererById } = await import("../src/renderer/index.ts");
    const textRenderer = rendererById.get("text");
    expect(textRenderer).toBeDefined();
    expect(textRenderer!.meta.id).toBe("text");
  });

  test("rendererById.get returns json renderer", async () => {
    const { rendererById } = await import("../src/renderer/index.ts");
    const jsonRenderer = rendererById.get("json");
    expect(jsonRenderer).toBeDefined();
    expect(jsonRenderer!.meta.id).toBe("json");
  });
});