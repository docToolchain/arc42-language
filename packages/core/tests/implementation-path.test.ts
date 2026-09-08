import { describe, expect, test } from "vite-plus/test";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";
import type { DocumentAst } from "../src/ast.ts";

function document(attributes: Record<string, string>): DocumentAst {
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

function workspace(...blocks: Record<string, string>[]) {
  const built = buildWorkspace(blocks.map(document));
  const index = buildIndex(built);
  const knownPaths = ["service.ts", "src", "src/child"];
  return validate(built, index, { pathEvidence: { knownPaths, root: "/repo" } });
}

describe("implementation paths", () => {
  test("parses and validates an existing file path", () => {
    const diagnostics = workspace({
      id: "service",
      title: "Service",
      implements: "",
      path: "service.ts",
    });
    expect(diagnostics.some((d) => d.code === "E011")).toBe(false);
  });

  test("reports missing and unresolved paths with distinct severities", () => {
    const diagnostics = workspace(
      { id: "missing", title: "Missing", implements: "" },
      { id: "broken", title: "Broken", implements: "", path: "does-not-exist" },
    );
    expect(diagnostics.find((d) => d.code === "H014")?.severity).toBe("hint");
    expect(diagnostics.find((d) => d.code === "E011")?.severity).toBe("error");
  });

  test("treats an explicitly empty path as unresolved", () => {
    const diagnostics = workspace({
      id: "empty",
      title: "Empty",
      implements: "",
      path: "",
    });
    expect(diagnostics.some((d) => d.code === "E011")).toBe(true);
    expect(diagnostics.some((d) => d.code === "H014")).toBe(false);
  });

  test("warns on nested paths without a matching parent relationship", () => {
    const diagnostics = workspace(
      { id: "one", title: "One", implements: "", path: "src" },
      { id: "two", title: "Two", implements: "", path: "src/child" },
    );
    expect(diagnostics.some((d) => d.code === "W018")).toBe(true);
  });
});
