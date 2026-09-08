import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function workspaceFromChapter(filePath: string, content: string) {
  return buildWorkspace([parseMarkdown(filePath, wrapDiagramMetadata(content))]);
}

function workspace(content: string) {
  return buildWorkspace([
    parseMarkdown("05-building-blocks.arc42.md", wrapDiagramMetadata(content)),
  ]);
}

function wrapDiagramMetadata(content: string): string {
  return content.replace(/:::diagram[\s\S]*?:::/g, (block, offset: number, source: string) =>
    source.slice(0, offset).endsWith("```arc42\n") ? block : `\`\`\`arc42\n${block}\n\`\`\``,
  );
}

const MINIMAL_BLOCKS = `:::building-block
id: bb-api
title: API
technology: REST
requires: if-api-db
:::
:::building-block
id: bb-db
title: Database
technology: PostgreSQL
:::
:::interface
id: if-api-db
title: API to DB
provider: bb-db
protocol: SQL
:::`;

const MERMAID_SOURCE = `graph TD
    bb-api["API"]
    bb-db["Database"]
    bb-api -->|"API to DB [SQL]"| bb-db`;

function parseDiagramDocument(content: string) {
  return parseMarkdown("test.arc42.md", `\`\`\`arc42\n${content}\n\`\`\``);
}

describe("building-block diagrams", () => {
  describe("parser", () => {
    test("parses view: building-block with a following fence → produces BuildingBlockDiagramNode", () => {
      const content = `:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const doc = parseDiagramDocument(content);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0]).toMatchObject({
        kind: "diagram",
        diagramType: "building-block",
        id: "bb-view",
        view: "building-block",
        notation: "mermaid",
        roots: [],
        source: MERMAID_SOURCE,
      });
    });

    test("parses view: building-block with roots", () => {
      const content = `:::diagram
id: bb-view
view: building-block
notation: mermaid
roots: bb-api, bb-db
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const doc = parseDiagramDocument(content);
      expect(doc.nodes).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((doc.nodes[0] as any).roots).toEqual(["bb-api", "bb-db"]);
    });

    test("parses view: building-block without a following fence (no source)", () => {
      const content = `:::diagram
id: bb-view
view: building-block
notation: mermaid
:::`;
      const doc = parseDiagramDocument(content);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0]).toMatchObject({
        kind: "diagram",
        diagramType: "building-block",
        source: "",
      });
    });
  });

  describe("builder", () => {
    test("diagram artifact carries the Mermaid source", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspace(content);

      expect(ws.parseErrors).toEqual([]);
      expect(ws.diagrams).toHaveLength(1);
      expect(ws.diagrams[0]).toMatchObject({
        diagramType: "building-block",
        id: "bb-view",
        view: "building-block",
        roots: [],
        source: MERMAID_SOURCE,
      });
    });

    test("roots are stored on the diagram artifact", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
roots: bb-api
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
\`\`\``;
      const ws = workspace(content);

      expect(ws.diagrams).toHaveLength(1);
      expect(ws.diagrams[0]).toMatchObject({ roots: ["bb-api"] });
    });

    test("builder emits a parse error when id is missing", () => {
      const content = `:::diagram
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      expect(
        ws.parseErrors.some((e) => e.message.includes("Missing required attribute 'id'")),
      ).toBe(true);
      expect(ws.diagrams).toHaveLength(0);
    });
  });

  describe("validator rule W019", () => {
    test("W019 fires when chapter 5 file has no building-block diagram", () => {
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", MINIMAL_BLOCKS);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "W019")).toBe(true);
    });

    test("W019 does not fire when a building-block diagram is present", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "W019")).toBe(false);
    });

    test("W019 does not fire for non-chapter-5 files", () => {
      const ws = workspaceFromChapter("06-runtime-view.arc42.md", MINIMAL_BLOCKS);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "W019")).toBe(false);
    });
  });

  describe("validator rule H015 (incomplete hierarchy)", () => {
    test("H015 fires when a building block id is absent from all diagram sources", () => {
      // bb-cache is in the model but not in the diagram source
      const content = `${MINIMAL_BLOCKS}
:::building-block
id: bb-cache
title: Cache
technology: Redis
:::
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
    bb-db["Database"]
    bb-api -->|"API to DB [SQL]"| bb-db
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H015" && d.message.includes("bb-cache"))).toBe(true);
    });

    test("H015 does not fire when union of all diagrams covers all blocks", () => {
      // Two diagrams: first covers bb-api, second covers bb-db — union is complete
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view-a
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
\`\`\`
:::diagram
id: bb-view-b
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-db["Database"]
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H015")).toBe(false);
    });
  });

  describe("validator rule H016 (missing interfaces)", () => {
    test("H016 fires when an interface id is absent from all diagram sources", () => {
      // Both bb-api and bb-db are visualized, but the interface id if-api-db is not in source
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
    bb-db["Database"]
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H016" && d.message.includes("if-api-db"))).toBe(true);
    });

    test("H016 does not fire when the interface id appears in the diagram source", () => {
      // Both blocks and interface id present in source
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
    bb-db["Database"]
    bb-api -->|"if-api-db"| bb-db
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H016")).toBe(false);
    });

    test("H016 does not fire when one endpoint is not visualized", () => {
      // Only bb-api is shown — interface between bb-api and bb-db should not trigger H016
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H016")).toBe(false);
    });
  });

  describe("E008 — duplicate diagram id", () => {
    test("E008 fires when two building-block diagrams share an id", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\`
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(
        diags.some((d) => d.code === "E008" && d.message.includes("duplicate diagram id")),
      ).toBe(true);
    });

    test("E008 does not fire when building-block diagram is present without issues", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "E008")).toBe(false);
    });
  });

  describe("validator rule E013 (unknown ids)", () => {
    test("E013 fires when a hyphenated id in the diagram does not exist in the model", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-api["API"]
    bb-unknown["Unknown"]
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "E013" && d.message.includes("bb-unknown"))).toBe(true);
    });

    test("E013 does not fire when all ids in the diagram exist in the model", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "E013")).toBe(false);
    });
  });

  describe("validator rule H017 (missing parent)", () => {
    test("H017 fires when a child block is shown without its parent", () => {
      const content = `:::building-block
id: bb-parent
title: Parent
:::
:::building-block
id: bb-child
title: Child
parent: bb-parent
:::
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-child["Child"]
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H017" && d.message.includes("bb-child"))).toBe(true);
    });

    test("H017 does not fire when a child block is shown with its parent", () => {
      const content = `:::building-block
id: bb-parent
title: Parent
:::
:::building-block
id: bb-child
title: Child
parent: bb-parent
:::
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
graph TD
    bb-parent["Parent"]
    bb-child["Child"]
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H017")).toBe(false);
    });

    test("H017 does not fire for top-level blocks without a parent", () => {
      const content = `${MINIMAL_BLOCKS}
:::diagram
id: bb-view
view: building-block
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "H017")).toBe(false);
    });
  });
});
