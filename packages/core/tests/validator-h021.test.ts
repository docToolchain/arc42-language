import { describe, expect, test } from "vite-plus/test";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import type { CoverageResult } from "../src/coverage.ts";

function makeContext(uncovered: string[]): { coverage: CoverageResult } {
  return {
    coverage: {
      covered: [],
      uncovered,
      totalFiles: uncovered.length,
      coveredFileCount: 0,
      uncoveredFileCount: uncovered.length,
    },
  };
}

function workspaceFor(content: string) {
  const ws = buildWorkspace([parseMarkdown("05-building-blocks.arc42.md", content)]);
  return { workspace: ws, index: buildIndex(ws) };
}

describe("H021 — uncovered source paths", () => {
  test("no hint when coverage has no uncovered paths", () => {
    const { workspace, index } = workspaceFor("# Building Blocks\n");
    const diags = validate(workspace, index, makeContext([])).filter((d) => d.code === "H021");
    expect(diags).toHaveLength(0);
  });

  test("one hint per uncovered path", () => {
    const { workspace, index } = workspaceFor("# Building Blocks\n");
    const diags = validate(
      workspace,
      index,
      makeContext(["packages/mermaid", "packages/site"]),
    ).filter((d) => d.code === "H021");
    expect(diags).toHaveLength(2);
    expect(diags[0]?.severity).toBe("hint");
    expect(diags[0]?.message).toContain("packages/mermaid");
    expect(diags[1]?.message).toContain("packages/site");
  });

  test("diagnostic file is the uncovered path itself (no owning element)", () => {
    const { workspace, index } = workspaceFor("# Building Blocks\n");
    const diags = validate(workspace, index, makeContext(["packages/mermaid"])).filter(
      (d) => d.code === "H021",
    );
    expect(diags[0]?.file).toBe("packages/mermaid");
    expect(diags[0]?.line).toBe(1);
  });

  test("no hint when context is absent (rule opts out gracefully)", () => {
    const { workspace, index } = workspaceFor("# Building Blocks\n");
    const diags = validate(workspace, index).filter((d) => d.code === "H021");
    expect(diags).toHaveLength(0);
  });

  test("no hint when context has no coverage field", () => {
    const { workspace, index } = workspaceFor("# Building Blocks\n");
    const diags = validate(workspace, index, {
      pathEvidence: { knownPaths: [], root: "/repo" },
    }).filter((d) => d.code === "H021");
    expect(diags).toHaveLength(0);
  });
});
