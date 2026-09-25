import { describe, expect, test } from "vite-plus/test";
import { diffTokens, wordTokens } from "./textDiff";

describe("diffTokens", () => {
  test("keeps the common part and marks only what changed", () => {
    expect(diffTokens(["a", "b", "c"], ["a", "b", "c", "d"])).toEqual([
      { op: "equal", values: ["a", "b", "c"] },
      { op: "insert", values: ["d"] },
    ]);
    expect(diffTokens(["a", "x", "c"], ["a", "y", "c"])).toEqual([
      { op: "equal", values: ["a"] },
      { op: "delete", values: ["x"] },
      { op: "insert", values: ["y"] },
      { op: "equal", values: ["c"] },
    ]);
  });

  test("handles empty sides and identical values", () => {
    expect(diffTokens([], ["a"])).toEqual([{ op: "insert", values: ["a"] }]);
    expect(diffTokens(["a"], [])).toEqual([{ op: "delete", values: ["a"] }]);
    expect(diffTokens(["a"], ["a"])).toEqual([{ op: "equal", values: ["a"] }]);
    expect(diffTokens([], [])).toEqual([]);
  });

  test("finds the longest common subsequence inside a changed middle", () => {
    const parts = diffTokens(["p", "a", "b", "c", "s"], ["p", "b", "x", "c", "y", "s"]);
    expect(parts).toEqual([
      { op: "equal", values: ["p"] },
      { op: "delete", values: ["a"] },
      { op: "equal", values: ["b"] },
      { op: "insert", values: ["x"] },
      { op: "equal", values: ["c"] },
      { op: "insert", values: ["y"] },
      { op: "equal", values: ["s"] },
    ]);
  });
});

describe("wordTokens", () => {
  test("splits words, whitespace and punctuation and joins back losslessly", () => {
    const text = "bb_skill=bb-skill, bb_cli=bb-cli";
    expect(wordTokens(text)).toEqual([
      "bb_skill",
      "=",
      "bb-skill",
      ",",
      " ",
      "bb_cli",
      "=",
      "bb-cli",
    ]);
    const prose = "HTTP (localhost) — static assets + JSON API";
    expect(wordTokens(prose).join("")).toBe(prose);
  });
});
