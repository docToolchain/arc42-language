import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function workspace(content: string) {
  return buildWorkspace([parseMarkdown("review.arc42.md", content)]);
}

describe("deployment diagram review regressions", () => {
  test("reports missing deployment diagram metadata as E010", () => {
    const ws = workspace(":::diagram\nview: deployment\n:::\n\n```mermaid\narchitecture-beta\n```");
    expect(ws.diagrams).toHaveLength(1);
    expect(validate(ws, buildIndex(ws)).some((diagnostic) => diagnostic.code === "E010")).toBe(
      true,
    );
  });

  test("validates parent and host references independently when ids overlap", () => {
    const ws = workspace(`:::deployment-node
id: node-parent
title: Parent
hosts: bb-api
:::
:::deployment-node
id: node-child
title: Child
parent: node-parent
hosts: node-parent
:::
:::building-block
id: bb-api
title: API
:::`);
    const errors = validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E002");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("building-block");
  });
});
