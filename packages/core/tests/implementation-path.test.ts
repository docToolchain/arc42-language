import { describe, expect, test } from "vite-plus/test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

function workspace(root: string, ...blocks: Record<string, string>[]) {
  const built = buildWorkspace(blocks.map(document));
  return validate(built, buildIndex(built), { dir: root, root });
}

describe("implementation paths", () => {
  test("parses and validates an existing file path", () => {
    const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-path-"));
    writeFileSync(join(root, "service.ts"), "export {};");
    const diagnostics = workspace(root, {
      id: "service",
      title: "Service",
      implements: "",
      path: "service.ts",
    });
    expect(diagnostics.some((d) => d.code === "E011")).toBe(false);
  });

  test("reports missing and unresolved paths with distinct severities", () => {
    const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-path-"));
    const diagnostics = workspace(
      root,
      { id: "missing", title: "Missing", implements: "" },
      { id: "broken", title: "Broken", implements: "", path: "does-not-exist" },
    );
    expect(diagnostics.find((d) => d.code === "H014")?.severity).toBe("hint");
    expect(diagnostics.find((d) => d.code === "E011")?.severity).toBe("error");
  });

  test("treats an explicitly empty path as unresolved", () => {
    const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-path-"));
    const diagnostics = workspace(root, {
      id: "empty",
      title: "Empty",
      implements: "",
      path: "",
    });
    expect(diagnostics.some((d) => d.code === "E011")).toBe(true);
    expect(diagnostics.some((d) => d.code === "H014")).toBe(false);
  });

  test("warns on nested paths without a matching parent relationship", () => {
    const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-path-"));
    mkdirSync(join(root, "src", "child"), { recursive: true });
    const diagnostics = workspace(
      root,
      { id: "one", title: "One", implements: "", path: "src" },
      { id: "two", title: "Two", implements: "", path: "src/child" },
    );
    expect(diagnostics.some((d) => d.code === "W018")).toBe(true);
  });
});
