import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function diagnosticsFor(file: string, content: string) {
  const workspace = buildWorkspace([parseMarkdown(file, content)]);
  return validate(workspace, buildIndex(workspace)).filter(
    (diagnostic) => diagnostic.code === "E016",
  );
}

const actor = `:::actor
id: customer
title: Customer
type: person
requires: []
:::`;

const iface = `:::interface
id: customer-api
title: Customer API
provider: customer-service
:::`;

const glossaryTerm = `:::glossary-term
id: chapter-term
title: Chapter Term
definition: A term used to test chapter assignment.
:::`;

describe("E016 — typed elements are assigned to their canonical chapter", () => {
  test("reports an interface in chapter 3 and expects chapter 5", () => {
    const diagnostics = diagnosticsFor("03-system-scope.arc42.md", iface);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("interface 'customer-api'");
    expect(diagnostics[0]?.message).toContain("chapter 5");
  });

  test("accepts an interface in chapter 5", () => {
    expect(diagnosticsFor("05-building-blocks.arc42.md", iface)).toHaveLength(0);
  });

  test("applies the same rule to non-interface elements", () => {
    const diagnostics = diagnosticsFor("05-building-blocks.arc42.md", actor);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("actor 'customer'");
    expect(diagnostics[0]?.message).toContain("chapter 3");
  });

  test("reports each misplaced element while accepting canonical elements", () => {
    const diagnostics = diagnosticsFor(
      "05-building-blocks.arc42.md",
      `${actor}\n\n${glossaryTerm}`,
    );
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((diagnostic) => diagnostic.message).join(" ")).toContain(
      "actor 'customer'",
    );
    expect(diagnostics.map((diagnostic) => diagnostic.message).join(" ")).toContain(
      "glossary-term 'chapter-term'",
    );
  });

  test("reports multiple interfaces in the same wrong chapter", () => {
    const secondInterface = iface.replace("customer-api", "customer-events");
    expect(
      diagnosticsFor("03-system-scope.arc42.md", `${iface}\n\n${secondInterface}`),
    ).toHaveLength(2);
  });

  test("uses the chapter mapping at the lower boundary", () => {
    const diagnostics = diagnosticsFor("01-introduction-and-goals.arc42.md", actor);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("chapter 3");
  });

  test("uses the chapter mapping at the upper boundary", () => {
    expect(diagnosticsFor("12-glossary.arc42.md", glossaryTerm)).toHaveLength(0);
  });

  test("ignores elements in unnumbered documents", () => {
    expect(diagnosticsFor("building-blocks.arc42.md", iface)).toHaveLength(0);
  });
});
