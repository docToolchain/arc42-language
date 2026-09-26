// Black-box tests of the files-in, model-out loader, through the public API.
import { describe, expect, test } from "vite-plus/test";
import {
  detectNotation,
  isArchitectureFile,
  loadNotationAdapter,
  loadWorkspaceFromFiles,
} from "../src/index.ts";

const markdown = `# Building Block View

## Service

The service owns **orders**.

\`\`\`arc42
:::building-block
id: service
title: Service
path: src/service
:::
\`\`\`
`;

const asciidoc = `= Building Block View

== Service

The service owns *orders*.

[source,arc42]
----
:::building-block
id: service
title: Service
path: src/service
:::
----
`;

describe("loadWorkspaceFromFiles", () => {
  test("builds a Markdown workspace with rendered prose and coverage", async () => {
    const payload = await loadWorkspaceFromFiles(
      [{ path: "docs/05-building-blocks.arc42.md", content: markdown }],
      ["docs/05-building-blocks.arc42.md", "src/service/index.ts", "src/other.ts"],
      "commit abc",
    );
    expect(payload.notation).toBe("markdown");
    expect(payload.elements.map((element) => element.id)).toEqual(["service"]);
    const html = payload.documents[0]!.nodes.flatMap((node) =>
      node.kind === "prose" && node.renderedHtml ? [node.renderedHtml] : [],
    );
    expect(html.join("")).toContain("<strong>orders</strong>");
    expect(payload.coverage).toMatchObject({ coveredFileCount: 1 });
  });

  test("builds an AsciiDoc workspace with its own prose renderer", async () => {
    const payload = await loadWorkspaceFromFiles(
      [{ path: "docs/05-building-blocks.arc42.adoc", content: asciidoc }],
      ["docs/05-building-blocks.arc42.adoc"],
      "commit abc",
    );
    expect(payload.notation).toBe("asciidoc");
    expect(payload.elements.map((element) => element.id)).toEqual(["service"]);
    const html = payload.documents[0]!.nodes.flatMap((node) =>
      node.kind === "prose" && node.renderedHtml ? [node.renderedHtml] : [],
    );
    expect(html.join("")).toContain("<strong>orders</strong>");
  });

  test("refuses a mixed-notation workspace and names the source", async () => {
    await expect(
      loadWorkspaceFromFiles(
        [
          { path: "a.arc42.md", content: markdown },
          { path: "b.arc42.adoc", content: asciidoc },
        ],
        [],
        "commit abc",
      ),
    ).rejects.toThrow(/Mixed notation workspace.*commit abc/);
  });
});

describe("notation helpers", () => {
  test("recognize architecture files and detect the notation", () => {
    expect(isArchitectureFile("docs/01-intro.arc42.md")).toBe(true);
    expect(isArchitectureFile("docs/01-intro.arc42.adoc")).toBe(true);
    expect(isArchitectureFile("docs/README.md")).toBe(false);
    expect(detectNotation(["a.arc42.adoc"], "here")).toBe("asciidoc");
    expect(detectNotation([], "here")).toBe("markdown");
  });

  test("load each notation's adapter on demand", async () => {
    expect((await loadNotationAdapter("markdown")).fileExtension).toBe(".arc42.md");
    expect((await loadNotationAdapter("asciidoc")).fileExtension).toBe(".arc42.adoc");
  });
});
