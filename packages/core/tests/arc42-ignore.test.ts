import { describe, expect, test } from "vite-plus/test";
import { parseArc42Ignore } from "../src/validator/arc42-ignore.ts";

describe("parseArc42Ignore", () => {
  test("parses non-empty, non-comment lines as patterns", () => {
    const result = parseArc42Ignore("scripts\n.vibe\n.gitignore\n");
    expect(result).toEqual(new Set(["scripts", ".vibe", ".gitignore"]));
  });

  test("ignores blank lines and lines starting with #", () => {
    const result = parseArc42Ignore(`
# This is a comment
scripts

# Another comment
.vibe
`);
    expect(result).toEqual(new Set(["scripts", ".vibe"]));
  });

  test("handles CRLF line endings", () => {
    const result = parseArc42Ignore("scripts\r\n.vibe\r\n");
    expect(result).toEqual(new Set(["scripts", ".vibe"]));
  });

  test("trims leading and trailing whitespace from each line", () => {
    const result = parseArc42Ignore("  scripts  \n  .vibe\n");
    expect(result).toEqual(new Set(["scripts", ".vibe"]));
  });

  test("returns empty set for empty content", () => {
    expect(parseArc42Ignore("")).toEqual(new Set());
    expect(parseArc42Ignore("# only comments\n")).toEqual(new Set());
  });

  test("deduplicates repeated entries", () => {
    const result = parseArc42Ignore("scripts\nscripts\n.vibe\n");
    expect(result).toEqual(new Set(["scripts", ".vibe"]));
  });
});
