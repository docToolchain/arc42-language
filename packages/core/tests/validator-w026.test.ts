import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";

function diagnosticsFor(content: string) {
  const document = parseMarkdown("test.arc42.md", content);
  const workspace = buildWorkspace([document]);
  return validate(workspace, buildIndex(workspace)).filter(
    (diagnostic) => diagnostic.code === "W026",
  );
}

const parentBlock = `:::building-block
id: bb-parent
title: Parent
:::`;

const childBlock = `:::building-block
id: bb-child
title: Child
parent: bb-parent
:::`;

describe("W026 — child building blocks are immediate subchapters of their parent", () => {
  test("emits a missing-parent-heading diagnostic when the parent has no heading", () => {
    const diagnostics = diagnosticsFor(`${parentBlock}

## Child

${childBlock}`);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("Parent building block 'bb-parent' has no heading");
  });

  test("emits a heading-depth diagnostic when the child is not one level deeper", () => {
    const diagnostics = diagnosticsFor(`## Parent

${parentBlock}

## Child

${childBlock}`);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("must be exactly one heading level deeper");
  });

  test("emits an ordering diagnostic when the child appears before its parent", () => {
    const diagnostics = diagnosticsFor(`### Child

${childBlock}

## Parent

${parentBlock}`);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain(
      "must appear after parent building block 'bb-parent'",
    );
  });

  test("accepts a parent followed by an immediate child subchapter", () => {
    expect(
      diagnosticsFor(`## Parent

${parentBlock}

### Child

${childBlock}`),
    ).toHaveLength(0);
  });

  test("emits an orphan-parent-section diagnostic when a drill-down omits the parent block", () => {
    const diagnostics = diagnosticsFor(`## Parent

${parentBlock}

## Parent drill-down

### Child

${childBlock}`);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain(
      "Parent section 'Parent drill-down' must document building block 'bb-parent'",
    );
  });
});
