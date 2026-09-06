import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

const missingPriority = (file: string) =>
  parseMarkdown(file, `\`\`\`arc42\n:::quality-goal\nid: qg-1\ntitle: Quality\n:::\n\`\`\``);

function diagnostics(documents: ReturnType<typeof missingPriority>[]) {
  const workspace = buildWorkspace(documents);
  return validate(workspace, buildIndex(workspace), { dir: "." });
}

describe("ignore directives", () => {
  test("suppress a matching diagnostic and its error no longer remains", () => {
    const document = missingPriority("a.md");
    document.nodes.unshift({
      kind: "ignore",
      ruleCode: "e005",
      reason: "intentional",
      startLine: 1,
      endLine: 1,
    });

    const result = diagnostics([document]);
    expect(result.filter((diagnostic) => diagnostic.code === "E005")).toHaveLength(0);
    expect(result.some((diagnostic) => diagnostic.severity === "error")).toBe(false);
  });

  test("does not suppress the same code in another file", () => {
    const result = diagnostics([
      {
        ...missingPriority("a.md"),
        nodes: [
          {
            kind: "ignore",
            ruleCode: "E005",
            startLine: 1,
            endLine: 1,
          },
        ],
      },
      missingPriority("b.md"),
    ]);

    expect(
      result.some((diagnostic) => diagnostic.code === "E005" && diagnostic.file === "b.md"),
    ).toBe(true);
    expect(
      result.some((diagnostic) => diagnostic.code === "W019" && diagnostic.file === "a.md"),
    ).toBe(true);
  });

  test("reports unused and self-targeting W019 directives", () => {
    const result = diagnostics([
      {
        ...missingPriority("a.md"),
        nodes: [
          { kind: "ignore", ruleCode: "E999", startLine: 3, endLine: 3 },
          { kind: "ignore", ruleCode: "W019", startLine: 4, endLine: 4 },
        ],
      },
    ]);

    expect(result.filter((diagnostic) => diagnostic.code === "W019")).toHaveLength(2);
    expect(result.every((diagnostic) => diagnostic.line === 3 || diagnostic.line === 4)).toBe(true);
  });
});
