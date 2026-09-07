import { describe, expect, test } from "vite-plus/test";
import { reconstructIgnoreSource } from "./AstNodeRenderer";
import { groupNodes } from "./DocumentView";

describe("ignore directive rendering", () => {
  test("reconstructs a directive with its reason", () => {
    expect(
      reconstructIgnoreSource({
        kind: "ignore",
        ruleCode: "W004",
        reason: "documented elsewhere",
        startLine: 12,
        endLine: 12,
      }),
    ).toBe(":::ignore W004 documented elsewhere :::");
  });

  test("keeps a bare directive visible in agent output", () => {
    expect(
      reconstructIgnoreSource({
        kind: "ignore",
        ruleCode: "W004",
        startLine: 12,
        endLine: 12,
      }),
    ).toBe(":::ignore W004 :::");
  });

  test("attaches an ignore between prose and a block without breaking the card group", () => {
    const groups = groupNodes([
      { kind: "prose", text: "Gateway description", line: 1 },
      { kind: "ignore", ruleCode: "H014", reason: "demo", startLine: 4, endLine: 4 },
      {
        kind: "block",
        blockType: "building-block",
        attributes: { id: "bb-gateway" },
        startLine: 5,
        endLine: 7,
        inArc42Fence: true,
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "prose-run", block: { kind: "block" } });
    expect(groups[0]?.kind === "prose-run" ? groups[0].ignores : []).toHaveLength(1);
  });
});
