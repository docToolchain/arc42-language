import { describe, expect, test } from "vite-plus/test";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";
import type { DocumentAst } from "../src/ast.ts";

function bbDoc(attributes: Record<string, string>): DocumentAst {
  return {
    filePath: "architecture.arc42.md",
    nodes: [
      {
        kind: "block",
        blockType: "building-block",
        attributes,
        startLine: 1,
        endLine: 1,
        inArc42Fence: true,
      },
    ],
  };
}

function ifDoc(attributes: Record<string, string>): DocumentAst {
  return {
    filePath: "architecture.arc42.md",
    nodes: [
      {
        kind: "block",
        blockType: "interface",
        attributes,
        startLine: 1,
        endLine: 1,
        inArc42Fence: true,
      },
    ],
  };
}

function workspace(...docs: DocumentAst[]) {
  const built = buildWorkspace(docs);
  const index = buildIndex(built);
  const knownPaths = ["service.ts", "src", "src/child", "packages/core/src/index.ts"];
  return validate(built, index, { pathEvidence: { knownPaths, root: "/repo" } });
}

function bbWorkspace(...blocks: Record<string, string>[]) {
  return workspace(...blocks.map(bbDoc));
}

describe("implementation paths", () => {
  test("parses and validates an existing file path", () => {
    const diagnostics = bbWorkspace({
      id: "service",
      title: "Service",
      implements: "",
      path: "service.ts",
    });
    expect(diagnostics.some((d) => d.code === "E011")).toBe(false);
  });

  test("reports missing and unresolved paths with distinct severities", () => {
    const diagnostics = bbWorkspace(
      { id: "missing", title: "Missing", implements: "" },
      { id: "broken", title: "Broken", implements: "", path: "does-not-exist" },
    );
    expect(diagnostics.find((d) => d.code === "H014")?.severity).toBe("hint");
    expect(diagnostics.find((d) => d.code === "E011")?.severity).toBe("error");
  });

  test("treats an explicitly empty path as unresolved", () => {
    const diagnostics = bbWorkspace({
      id: "empty",
      title: "Empty",
      implements: "",
      path: "",
    });
    expect(diagnostics.some((d) => d.code === "E011")).toBe(true);
    expect(diagnostics.some((d) => d.code === "H014")).toBe(false);
  });

  test("warns on nested paths without a matching parent relationship", () => {
    const diagnostics = bbWorkspace(
      { id: "one", title: "One", implements: "", path: "src" },
      { id: "two", title: "Two", implements: "", path: "src/child" },
    );
    expect(diagnostics.some((d) => d.code === "W018")).toBe(true);
  });

  test("W018: warns when two building-blocks claim the same path", () => {
    const diagnostics = bbWorkspace(
      { id: "bb-a", title: "A", implements: "", path: "src" },
      { id: "bb-b", title: "B", implements: "", path: "src" },
    );
    const w018 = diagnostics.filter((d) => d.code === "W018");
    expect(w018.length).toBeGreaterThan(0);
    expect(w018[0]?.message).toContain("same implementation path");
  });

  test("H020: hints when two interfaces point to the same path", () => {
    const diagnostics = workspace(
      bbDoc({ id: "bb-core", title: "Core", implements: "", path: "src" }),
      ifDoc({
        id: "if-a",
        title: "Interface A",
        provider: "bb-core",
        path: "packages/core/src/index.ts",
      }),
      ifDoc({
        id: "if-b",
        title: "Interface B",
        provider: "bb-core",
        path: "packages/core/src/index.ts",
      }),
    );
    const h020 = diagnostics.filter((d) => d.code === "H020");
    expect(h020.length).toBeGreaterThan(0);
    expect(h020[0]?.severity).toBe("hint");
    expect(h020[0]?.message).toContain("same implementation path");
    // W018 should NOT fire for interface-vs-interface
    expect(diagnostics.filter((d) => d.code === "W018")).toHaveLength(0);
  });

  test("W018: does NOT warn when bb and interface share a path (expected pattern)", () => {
    const diagnostics = workspace(
      bbDoc({ id: "bb-core", title: "Core", implements: "", path: "src" }),
      ifDoc({
        id: "if-index",
        title: "Index",
        provider: "bb-core",
        path: "packages/core/src/index.ts",
      }),
    );
    // No W018 — bb owns a directory, interface points to a file inside it
    const w018 = diagnostics.filter((d) => d.code === "W018");
    expect(w018).toHaveLength(0);
  });
});
