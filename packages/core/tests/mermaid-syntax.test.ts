import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validateAsync } from "../src/validator/index.ts";

describe("Mermaid syntax validation", () => {
  test("reports parser errors missed by the semantic rule", async () => {
    const document = parseMarkdown(
      "deployment.arc42.md",
      `\`\`\`arc42
:::diagram
id: invalid-syntax
view: deployment
notation: mermaid-architecture
:::
\`\`\`

\`\`\`mermaid
architecture-beta
    service broken(server)[Broken
\`\`\``,
    );
    const workspace = buildWorkspace([document]);

    const diagnostics = await validateAsync(workspace, buildIndex(workspace));
    const parserDiagnostics = diagnostics.filter(
      (diagnostic) =>
        diagnostic.code === "E010" && diagnostic.message.startsWith("Mermaid syntax error:"),
    );

    expect(parserDiagnostics).toHaveLength(1);
    expect(
      diagnostics.filter((diagnostic) => diagnostic.file === "deployment.arc42.md"),
    ).toHaveLength(1);
  }, 15_000);

  test("validates anonymous Mermaid fences with auto-detection", async () => {
    const document = parseMarkdown(
      "anonymous.arc42.md",
      "```mermaid\nflowchart LR\n  broken -->\n```",
    );
    const workspace = buildWorkspace([document]);

    const diagnostics = await validateAsync(workspace, buildIndex(workspace));

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "E013",
        file: "anonymous.arc42.md",
        line: 1,
      }),
    );
  }, 15_000);

  test("reports an empty class diagram source", async () => {
    const document = parseMarkdown(
      "building-blocks.arc42.md",
      `\`\`\`arc42
:::diagram
id: empty-class
view: building-block
notation: mermaid-class
:::
\`\`\``,
    );
    const workspace = buildWorkspace([document]);

    const diagnostics = await validateAsync(workspace, buildIndex(workspace));

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "E008",
        message: "Diagram 'empty-class': source must not be empty",
      }),
    );
    expect(
      diagnostics.filter((diagnostic) => diagnostic.file === "building-blocks.arc42.md"),
    ).toHaveLength(1);
  });
});
