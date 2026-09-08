import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function workspaceFromChapter(filePath: string, content: string) {
  return buildWorkspace([parseMarkdown(filePath, content)]);
}

function workspace(content: string) {
  return buildWorkspace([parseMarkdown("03-context.arc42.md", content)]);
}

const MINIMAL_ACTORS = `:::actor
id: act-user
title: End User
type: person
requires: if-user
:::
:::actor
id: act-system
title: External System
type: system
requires: if-system
:::`;

const MERMAID_SOURCE = `graph TD
    act-user(["End User"])
    act-system["External System"]`;

describe("context diagrams", () => {
  describe("parser", () => {
    test("parses view: context with a following fence → produces ContextDiagramNode", () => {
      const content = `:::diagram
id: ctx-view
view: context
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const doc = parseMarkdown("test.arc42.md", content);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0]).toMatchObject({
        kind: "diagram",
        diagramType: "context",
        id: "ctx-view",
        view: "context",
        notation: "mermaid",
        roots: [],
        source: MERMAID_SOURCE,
      });
    });

    test("parses view: context with roots", () => {
      const content = `:::diagram
id: ctx-view
view: context
notation: mermaid
roots: act-user, bb-api
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const doc = parseMarkdown("test.arc42.md", content);
      expect(doc.nodes).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((doc.nodes[0] as any).roots).toEqual(["act-user", "bb-api"]);
    });

    test("parses view: context without a following fence (no source)", () => {
      const content = `:::diagram
id: ctx-view
view: context
notation: mermaid
:::`;
      const doc = parseMarkdown("test.arc42.md", content);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0]).toMatchObject({
        kind: "diagram",
        diagramType: "context",
        source: "",
      });
    });
  });

  describe("builder", () => {
    test("diagram artifact carries the Mermaid source", () => {
      const content = `${MINIMAL_ACTORS}
:::diagram
id: ctx-view
view: context
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspace(content);

      expect(ws.parseErrors).toEqual([]);
      expect(ws.diagrams).toHaveLength(1);
      expect(ws.diagrams[0]).toMatchObject({
        diagramType: "context",
        id: "ctx-view",
        view: "context",
        roots: [],
        source: MERMAID_SOURCE,
      });
    });

    test("roots are stored on the diagram artifact", () => {
      const content = `${MINIMAL_ACTORS}
:::diagram
id: ctx-view
view: context
notation: mermaid
roots: act-user
:::
\`\`\`mermaid
graph TD
    act-user(["End User"])
\`\`\``;
      const ws = workspace(content);

      expect(ws.diagrams).toHaveLength(1);
      expect(ws.diagrams[0]).toMatchObject({ roots: ["act-user"] });
    });
  });

  describe("validator rule W020", () => {
    test("W020 fires when chapter 3 file has no context diagram", () => {
      const ws = workspaceFromChapter("03-context.arc42.md", MINIMAL_ACTORS);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "W020")).toBe(true);
    });

    test("W020 does not fire when a context diagram is present", () => {
      const content = `${MINIMAL_ACTORS}
:::diagram
id: ctx-view
view: context
notation: mermaid
:::
\`\`\`mermaid
${MERMAID_SOURCE}
\`\`\``;
      const ws = workspaceFromChapter("03-context.arc42.md", content);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "W020")).toBe(false);
    });

    test("W020 does not fire for non-chapter-3 files", () => {
      const ws = workspaceFromChapter("05-building-blocks.arc42.md", MINIMAL_ACTORS);
      const diags = validate(ws, buildIndex(ws));
      expect(diags.some((d) => d.code === "W020")).toBe(false);
    });
  });
});
