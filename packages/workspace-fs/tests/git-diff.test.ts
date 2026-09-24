import { describe, expect, test } from "vite-plus/test";
import { parseDiffPathHeader } from "../src/git-diff.ts";

// Snapshot acquisition (working tree, index, references, failures) is covered
// by the black-box tests in diff-snapshots.test.ts.
describe("Git diff acquisition", () => {
  test("parses quoted Git paths", () => {
    expect(
      parseDiffPathHeader(
        'diff --git "a/architecture docs.arc42.md" "b/architecture docs.arc42.md"',
      ),
    ).toBe("architecture docs.arc42.md");
    expect(parseDiffPathHeader('diff --git "a/quote\\\".md" "b/quote\\\".md"')).toBe('quote".md');
    expect(parseDiffPathHeader('diff --git "a/\\303\\244.md" "b/\\303\\244.md"')).toBe("ä.md");
  });
});
