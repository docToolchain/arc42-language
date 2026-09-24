import { describe, expect, test } from "vite-plus/test";
import { validateDocuments } from "../src/arc42.ts";
import type { ValidationContext } from "../src/validator/types.ts";
import { parseAsciidoc } from "../src/parser/asciidoc-parser.ts";

// Minimal helper that parses an AsciiDoc string and returns a document
function adocDoc(content: string) {
  return parseAsciidoc("test.arc42.adoc", content);
}

describe("AsciiDoc workspace validation — integration", () => {
  test("validates a minimal .arc42.adoc workspace with no errors", () => {
    const content = [
      "= Architecture",
      "",
      "== Quality Goals",
      "",
      "[source,arc42]",
      "----",
      ":::quality-goal",
      "id: qg-perf",
      "title: Performance",
      "priority: high",
      ":::",
      "----",
    ].join("\n");

    const result = validateDocuments([adocDoc(content)]);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  });

  test("W016 fires for a block outside the [source,arc42] fence in .arc42.adoc", () => {
    const content = [
      "= Architecture",
      "",
      ":::building-block",
      "id: bb-unwrapped",
      "title: Unwrapped",
      "technology: TypeScript",
      ":::",
    ].join("\n");

    const context: ValidationContext = {
      fenceDescription: "[source,arc42] / ---- fence",
    };
    const result = validateDocuments([adocDoc(content)], context);
    const w016 = result.diagnostics.filter((d) => d.code === "W016");
    expect(w016).toHaveLength(1);
    // The message should use the AsciiDoc fence description
    expect(w016[0]!.message).toContain("[source,arc42]");
  });

  test("parses a multi-chapter AsciiDoc workspace correctly", () => {
    // quality-goal belongs in ch10; constraint belongs in ch02
    const ch10 = [
      "= Quality Requirements",
      "",
      "[source,arc42]",
      "----",
      ":::quality-goal",
      "id: qg-availability",
      "title: Availability",
      "priority: high",
      ":::",
      "----",
    ].join("\n");

    const ch02 = [
      "= Constraints",
      "",
      "[source,arc42]",
      "----",
      ":::constraint",
      "id: con-no-cloud",
      "title: No Cloud Dependency",
      "category: technical",
      ":::",
      "----",
    ].join("\n");

    const result = validateDocuments([
      parseAsciidoc("10-quality-requirements.arc42.adoc", ch10),
      parseAsciidoc("02-constraints.arc42.adoc", ch02),
    ]);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});
