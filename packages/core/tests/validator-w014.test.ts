import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";

function workspaceFromContent(filePath: string, content: string) {
  const doc = parseMarkdown(filePath, content);
  return buildWorkspace([doc]);
}

describe("W014 — quality goals not in descending priority order", () => {
  test("emitted when low-priority goal appears before high-priority", () => {
    const content = `## Low Goal

Some prose.

:::quality-goal
id: qg-low
title: Low Goal
priority: low
:::

## High Goal

Some prose.

:::quality-goal
id: qg-high
title: High Goal
priority: high
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(true);
    expect(diags.find((d) => d.code === "W014")!.message).toContain("qg-high");
  });

  test("emitted when medium-priority goal appears before high-priority", () => {
    const content = `## Medium Goal

Some prose.

:::quality-goal
id: qg-med
title: Medium Goal
priority: medium
:::

## High Goal

Some prose.

:::quality-goal
id: qg-high
title: High Goal
priority: high
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(true);
  });

  test("NOT emitted when goals are in correct order: high → medium → low", () => {
    const content = `## High Goal

Some prose.

:::quality-goal
id: qg-high
title: High Goal
priority: high
:::

## Medium Goal

Some prose.

:::quality-goal
id: qg-med
title: Medium Goal
priority: medium
:::

## Low Goal

Some prose.

:::quality-goal
id: qg-low
title: Low Goal
priority: low
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(false);
  });

  test("NOT emitted when all goals have the same priority", () => {
    const content = `## High Goal A

Some prose.

:::quality-goal
id: qg-h1
title: High A
priority: high
:::

## High Goal B

Some prose.

:::quality-goal
id: qg-h2
title: High B
priority: high
:::`;
    const ws = workspaceFromContent("test.arc42.md", content);
    const idx = buildIndex(ws);
    const diags = validate(ws, idx);
    expect(diags.some((d) => d.code === "W014")).toBe(false);
  });
});
