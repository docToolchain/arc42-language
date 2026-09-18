import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

// Produces E005 (missing required attribute 'priority') + W004 (no prose) on line 2
const missingPriority = (file: string) =>
  parseMarkdown(file, `\`\`\`arc42\n:::quality-goal\nid: qg-1\ntitle: Quality\n:::\n\`\`\``);

// Produces W004 (no prose) on line 2 — valid block, suppressible warning
const validGoal = (file: string) =>
  parseMarkdown(
    file,
    `\`\`\`arc42\n:::quality-goal\nid: qg-1\ntitle: Quality\npriority: high\n:::\n\`\`\``,
  );

function diagnostics(documents: ReturnType<typeof missingPriority>[]) {
  const workspace = buildWorkspace(documents);
  return validate(workspace, buildIndex(workspace), {});
}

describe("ignore directives", () => {
  test("suppresses a matching W diagnostic and it no longer remains", () => {
    const document = validGoal("a.md");
    document.nodes.unshift({
      kind: "ignore",
      ruleCode: "W004",
      reason: "intentional",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    expect(result.filter((d) => d.code === "W004")).toHaveLength(0);
    expect(result.filter((d) => d.code === "W019")).toHaveLength(0);
  });

  test("suppresses a matching H diagnostic", () => {
    const document = validGoal("a.md");
    document.nodes.unshift({
      kind: "ignore",
      ruleCode: "H002",
      reason: "no decision needed for this goal",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    expect(result.filter((d) => d.code === "H002")).toHaveLength(0);
    expect(result.filter((d) => d.code === "W019")).toHaveLength(0);
  });

  test("E-code directive emits W030 and does NOT suppress the error", () => {
    const document = missingPriority("a.md");
    document.nodes.unshift({
      kind: "ignore",
      ruleCode: "E005",
      reason: "intentional",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    // W030 must be emitted
    const w030 = result.find((d) => d.code === "W030");
    expect(w030).toBeDefined();
    expect(w030!.message).toMatch(/E005/);
    // E005 must NOT be suppressed (still present)
    expect(result.some((d) => d.code === "E005")).toBe(true);
    // No W019 for the same rejected directive
    expect(result.filter((d) => d.code === "W019")).toHaveLength(0);
  });

  test("does not suppress the same W code in another file", () => {
    const docA = validGoal("a.md");
    docA.nodes.unshift({
      kind: "ignore",
      ruleCode: "W004",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([docA, validGoal("b.md")]);

    // W004 suppressed in a.md, still present in b.md
    expect(result.some((d) => d.code === "W004" && d.file === "b.md")).toBe(true);
    expect(result.filter((d) => d.code === "W004" && d.file === "a.md")).toHaveLength(0);
    // directive in a.md was used — no W019
    expect(result.filter((d) => d.code === "W019" && d.file === "a.md")).toHaveLength(0);
  });

  test("suppresses only one matching diagnostic per directive", () => {
    const document = parseMarkdown(
      "a.md",
      `\`\`\`arc42
:::quality-goal
id: qg-1
title: Quality 1
priority: high
:::
:::quality-goal
id: qg-2
title: Quality 2
priority: medium
:::
\`\`\``,
    );
    document.nodes.unshift({
      kind: "ignore",
      ruleCode: "W004",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    // One suppressed, one remains
    expect(result.filter((d) => d.code === "W004")).toHaveLength(1);
  });

  test("reports unused W019 self-targeting directive as stale", () => {
    const result = diagnostics([
      {
        ...validGoal("a.md"),
        nodes: [{ kind: "ignore", ruleCode: "W019", startLine: 1, endLine: 1 }],
      },
    ]);

    // W019 directive is stale (nothing to suppress) → emits W019 for itself
    expect(result.some((d) => d.code === "W019")).toBe(true);
  });
});
