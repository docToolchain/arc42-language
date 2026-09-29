import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

// Produces EG02 (missing required attribute 'priority') + WG02 (no prose) on line 2
const missingPriority = (file: string) =>
  parseMarkdown(file, `\`\`\`arc42\n:::quality-goal\nid: qg-1\ntitle: Quality\n:::\n\`\`\``);

// Produces WG02 (no prose) on line 2 — valid block, suppressible warning
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
      ruleCode: "WG02",
      reason: "intentional",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    expect(result.filter((d) => d.code === "WG02")).toHaveLength(0);
    expect(result.filter((d) => d.code === "WG06")).toHaveLength(0);
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
    expect(result.filter((d) => d.code === "WG06")).toHaveLength(0);
  });

  test("E-code directive emits WG07 and does NOT suppress the error", () => {
    const document = missingPriority("a.md");
    document.nodes.unshift({
      kind: "ignore",
      ruleCode: "EG02",
      reason: "intentional",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    // WG07 must be emitted
    const wg07 = result.find((d) => d.code === "WG07");
    expect(wg07).toBeDefined();
    expect(wg07!.message).toMatch(/EG02/);
    // EG02 must NOT be suppressed (still present)
    expect(result.some((d) => d.code === "EG02")).toBe(true);
    // No WG06 for the same rejected directive
    expect(result.filter((d) => d.code === "WG06")).toHaveLength(0);
  });

  test("does not suppress the same W code in another file", () => {
    const docA = validGoal("a.md");
    docA.nodes.unshift({
      kind: "ignore",
      ruleCode: "WG02",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([docA, validGoal("b.md")]);

    // WG02 suppressed in a.md, still present in b.md
    expect(result.some((d) => d.code === "WG02" && d.file === "b.md")).toBe(true);
    expect(result.filter((d) => d.code === "WG02" && d.file === "a.md")).toHaveLength(0);
    // directive in a.md was used — no WG06
    expect(result.filter((d) => d.code === "WG06" && d.file === "a.md")).toHaveLength(0);
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
      ruleCode: "WG02",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    // One suppressed, one remains
    expect(result.filter((d) => d.code === "WG02")).toHaveLength(1);
  });

  test("reports unused WG06 self-targeting directive as stale", () => {
    const result = diagnostics([
      {
        ...validGoal("a.md"),
        nodes: [{ kind: "ignore", ruleCode: "WG06", startLine: 1, endLine: 1 }],
      },
    ]);

    // WG06 directive is stale (nothing to suppress) → emits WG06 for itself
    expect(result.some((d) => d.code === "WG06")).toBe(true);
  });
});
