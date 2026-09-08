import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function workspace(content: string) {
  const wrapped = content.replace(
    /:::diagram[\s\S]*?:::/g,
    (block) => `\`\`\`arc42\n${block}\n\`\`\``,
  );
  return buildWorkspace([parseMarkdown("review.arc42.md", wrapped)]);
}

describe("deployment diagram review regressions", () => {
  test("reports missing deployment diagram metadata as E005 parse error", () => {
    const ws = workspace(":::diagram\nview: deployment\n:::\n\n```mermaid\narchitecture-beta\n```");
    // Missing 'id' is now caught by Zod schema validation at build time (parse error),
    // not deferred to E010 at validation time.
    expect(ws.parseErrors.some((e) => e.message.includes("Missing required attribute 'id'"))).toBe(
      true,
    );
    expect(ws.diagrams).toHaveLength(0);
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
