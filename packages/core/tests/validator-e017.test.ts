import { describe, expect, test } from "vite-plus/test";
import { validateDocuments } from "../src/arc42.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { parseAsciidoc } from "../src/parser/asciidoc-parser.ts";

function e017(docs: Parameters<typeof validateDocuments>[0]) {
  return validateDocuments(docs).diagnostics.filter((d) => d.code === "E017");
}

const block = ["```arc42", ":::building-block", "id: service", "title: Service", ":::", "```"];

describe("E017 — block outside any section", () => {
  test("reports a block in a document without headings", () => {
    const doc = parseMarkdown("a.arc42.md", ["The service.", "", ...block].join("\n"));
    const diagnostics = e017([doc]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ severity: "error", file: "a.arc42.md", line: 4 });
    expect(diagnostics[0]?.message).toContain("'service'");
  });

  test("reports a block above the first heading", () => {
    const doc = parseMarkdown(
      "a.arc42.md",
      [...block, "", "# Architecture", "", "## Other", "", "Prose."].join("\n"),
    );
    expect(e017([doc])).toHaveLength(1);
  });

  test("accepts a block below a heading", () => {
    const doc = parseMarkdown(
      "a.arc42.md",
      ["# Architecture", "", "## Service", "", "The service.", "", ...block].join("\n"),
    );
    expect(e017([doc])).toHaveLength(0);
  });

  test("reports an AsciiDoc block above the document title", () => {
    const doc = parseAsciidoc(
      "a.arc42.adoc",
      [
        "[source,arc42]",
        "----",
        ":::building-block",
        "id: service",
        "title: Service",
        ":::",
        "----",
        "",
        "= Architecture",
      ].join("\n"),
    );
    expect(e017([doc])).toHaveLength(1);
  });
});
