import { describe, expect, test } from "vite-plus/test";
import { diffTokens, markHtmlChanges, wordTokens } from "./textDiff";

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

describe("markHtmlChanges", () => {
  const marks = { added: "a", removed: "r" };

  test("marks only the changed words and keeps the markup", () => {
    expect(
      markHtmlChanges(
        ["<p>The service owns <strong>orders</strong>.</p>"],
        ["<p>The service owns <strong>orders</strong> and invoices.</p>"],
        marks,
      ),
    ).toEqual([
      '<p>The service owns <strong>orders</strong><ins class="a"> and invoices</ins>.</p>',
    ]);
    expect(
      markHtmlChanges(["<p>Uses Node for the API.</p>"], ["<p>Uses Go for the API.</p>"], marks),
    ).toEqual(['<p>Uses <del class="r">Node</del><ins class="a">Go</ins> for the API.</p>']);
  });

  test("returns unchanged prose as it was", () => {
    const html = ["<p>Same &amp; unchanged.</p>\n", "<ul><li>item</li></ul>"];
    expect(markHtmlChanges(html, html, marks)).toEqual(html);
  });

  test("keeps a removed paragraph as a paragraph and adds a new one", () => {
    expect(
      markHtmlChanges(["<p>One.</p><p>Two.</p>"], ["<p>One.</p><p>Three.</p>"], marks),
    ).toEqual(['<p>One.</p><p><del class="r">Two</del><ins class="a">Three</ins>.</p>']);
    expect(markHtmlChanges(["<p>One.</p><p>Gone here.</p>"], ["<p>One.</p>"], marks)).toEqual([
      '<p>One.</p><p><del class="r">Gone here.</del></p>',
    ]);
  });

  test("keeps each head fragment separate and places removed text in the next one", () => {
    expect(
      markHtmlChanges(["<p>A old.</p>", "<p>B.</p>"], ["<p>A.</p>", "<p>B new.</p>"], marks),
    ).toEqual(['<p>A<del class="r"> old</del>.</p>', '<p>B<ins class="a"> new</ins>.</p>']);
  });

  test("reads a rewritten phrase as removed then added, not as fragments", () => {
    expect(
      markHtmlChanges(
        ["<p>Loads the patch of the change.</p>"],
        ["<p>Loads base and head snapshots.</p>"],
        marks,
      ),
    ).toEqual([
      '<p>Loads <del class="r">the patch of the change</del><ins class="a">base and head snapshots</ins>.</p>',
    ]);
  });
});
