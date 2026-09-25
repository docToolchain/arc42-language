import { describe, expect, test } from "vite-plus/test";
import { loadWorkspaceFromDocuments } from "../src/arc42.ts";
import { buildDiffView } from "../src/diff-view.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { diffWorkspaces } from "../src/workspace-diff.ts";

const BB = "05-building-blocks.arc42.md";
const CONCEPTS = "08-concepts.arc42.md";

function workspace(files: Record<string, string>) {
  return loadWorkspaceFromDocuments(
    Object.entries(files).map(([file, content]) => parseMarkdown(file, content)),
  );
}

function block(type: string, attributes: Record<string, string>): string {
  const lines = Object.entries(attributes).map(([key, value]) => `${key}: ${value}`);
  return ["```arc42", `:::${type}`, ...lines, ":::", "```"].join("\n");
}

const concepts = `# Cross-cutting Concepts\n\n## Logging\n\nStructured logs.\n\n${block("concept", { id: "logging", title: "Logging" })}\n`;

function buildingBlocks(technology: string, extra = ""): string {
  return `# Building Block View\n\n## Service\n\nOwns orders.\n\n${block("building-block", { id: "service", title: "Service", technology, implements: "logging" })}\n\n## Other\n\nUnrelated.\n${extra}`;
}

describe("buildDiffView", () => {
  test("renders a modified section with both sides and its related elements", () => {
    const base = workspace({ [BB]: buildingBlocks("Node"), [CONCEPTS]: concepts });
    const head = workspace({ [BB]: buildingBlocks("Go"), [CONCEPTS]: concepts });
    const view = buildDiffView(base, head);

    expect(view.documents).toHaveLength(1);
    const [document] = view.documents;
    expect(document).toMatchObject({
      file: BB,
      title: "Building Block View",
      added: 0,
      modified: 1,
      removed: 0,
    });
    expect(document!.segments).toHaveLength(1);
    const [segment] = document!.segments;
    expect(segment).toMatchObject({
      status: "modified",
      section: { headingPath: ["Building Block View", "Service"] },
      elements: [{ id: "service", status: "modified" }],
    });
    expect(segment!.head!.nodes[0]).toMatchObject({ kind: "heading", text: "Service" });
    expect(
      segment!.head!.nodes.some((node) => node.kind === "heading" && node.text === "Other"),
    ).toBe(false);
    expect(segment!.head!.elements.map((element) => element.id)).toEqual(["logging", "service"]);
    expect(segment!.head!.edges).toEqual([
      { from: "service", to: "logging", relation: "implements" },
    ]);
    expect(
      (
        segment!.base!.elements.find((element) => element.id === "service") as {
          technology: string;
        }
      ).technology,
    ).toBe("Node");
  });

  test("uses a precomputed diff and leaves unchanged documents out", () => {
    const base = workspace({ [BB]: buildingBlocks("Node"), [CONCEPTS]: concepts });
    const head = workspace({ [BB]: buildingBlocks("Go"), [CONCEPTS]: concepts });
    const diff = diffWorkspaces(base, head);
    expect(buildDiffView(base, head, diff)).toEqual(buildDiffView(base, head));
    expect(buildDiffView(base, head).edges).toEqual([]);
  });

  test("marks added and removed sections with a single side", () => {
    const added = `\n## Worker\n\nRuns jobs.\n\n${block("building-block", { id: "worker", title: "Worker" })}\n`;
    const view = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node") }),
      workspace({ [BB]: buildingBlocks("Node", added) }),
    );
    const [segment] = view.documents[0]!.segments;
    expect(segment).toMatchObject({
      status: "added",
      elements: [{ id: "worker", status: "added" }],
    });
    expect(segment!.base).toBeUndefined();

    const reverse = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node", added) }),
      workspace({ [BB]: buildingBlocks("Node") }),
    );
    expect(reverse.documents[0]!.segments[0]).toMatchObject({ status: "removed" });
    expect(reverse.documents[0]!.segments[0]!.head).toBeUndefined();
  });

  test("includes prose-only sections with their change", () => {
    const view = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node") }),
      workspace({ [BB]: buildingBlocks("Node").replace("Unrelated.", "Now related.") }),
    );
    expect(view.documents[0]!.segments).toMatchObject([
      {
        status: "modified",
        section: { headingPath: ["Building Block View", "Other"] },
        prose: { status: "modified" },
        elements: [],
      },
    ]);
  });

  test("includes diagram changes with the elements the diagram mentions", () => {
    const diagram = (edge: string) =>
      `\n## Overview\n\nThe big picture.\n\n\`\`\`arc42\n:::diagram\nid: overview\nnotation: mermaid\n:::\n\`\`\`\n\`\`\`mermaid\nflowchart LR\n  ${edge}\n\`\`\`\n`;
    const view = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node", diagram("service --> a")), [CONCEPTS]: concepts }),
      workspace({
        [BB]: buildingBlocks("Node", diagram("service --> logging")),
        [CONCEPTS]: concepts,
      }),
    );
    const [segment] = view.documents[0]!.segments;
    expect(segment).toMatchObject({ diagrams: [{ id: "overview", status: "modified" }] });
    expect(segment!.head!.elements.map((element) => element.id)).toEqual(["logging", "service"]);
  });

  test("shows an element moved between sections in both segments", () => {
    const moved = `# Building Block View\n\n## Service\n\nOwns orders.\n\n## Core\n\nThe service now lives here.\n\n${block("building-block", { id: "service", title: "Service", technology: "Node", implements: "logging" })}\n\n## Other\n\nUnrelated.\n`;
    const view = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node"), [CONCEPTS]: concepts }),
      workspace({ [BB]: moved, [CONCEPTS]: concepts }),
    );
    expect(
      view.documents[0]!.segments.map((segment) => [
        segment.section.headingPath.at(-1),
        segment.status,
      ]),
    ).toEqual([
      ["Service", "modified"],
      ["Core", "added"],
    ]);
  });

  test("survives a JSON round trip unchanged", () => {
    const view = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node"), [CONCEPTS]: concepts }),
      workspace({ [BB]: buildingBlocks("Go"), [CONCEPTS]: concepts }),
    );
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });

  test("outlines a changed document with every section and its status", () => {
    const view = buildDiffView(
      workspace({ [BB]: buildingBlocks("Node"), [CONCEPTS]: concepts }),
      workspace({ [BB]: buildingBlocks("Go"), [CONCEPTS]: concepts }),
    );
    const outline = view.documents[0]!.outline;
    expect(outline.map((entry) => [entry.level, entry.title, entry.status, entry.empty])).toEqual([
      [1, "Building Block View", "unchanged", true],
      [2, "Service", "modified", false],
      [2, "Other", "unchanged", false],
    ]);
    // Head line ranges slice the head document into its sections.
    expect(outline[1]!.head!.startLine).toBe(3);
    expect(outline[1]!.head!.endLine).toBe(outline[2]!.head!.startLine - 1);
    expect(outline[2]!.head!.endLine).toBe(Number.MAX_SAFE_INTEGER);
  });

  test("places a removed section after the section that preceded it", () => {
    const three = `# Glossary\n\n## Alpha\n\nA.\n\n## Beta\n\nB.\n\n## Gamma\n\nC.\n`;
    const withoutBeta = `# Glossary\n\n## Alpha\n\nA.\n\n## Gamma\n\nC.\n`;
    const view = buildDiffView(
      workspace({ "12-glossary.arc42.md": three }),
      workspace({ "12-glossary.arc42.md": withoutBeta }),
    );
    expect(view.documents[0]!.outline.map((entry) => [entry.title, entry.status])).toEqual([
      ["Glossary", "unchanged"],
      ["Alpha", "unchanged"],
      ["Beta", "removed"],
      ["Gamma", "unchanged"],
    ]);
    expect(view.documents[0]!.outline[2]!.head).toBeUndefined();
  });

  test("places removed leading sections first and outlines added and deleted documents", () => {
    const view = buildDiffView(
      workspace({ "12-glossary.arc42.md": `Intro prose.\n\n# Glossary\n\nTerms.\n` }),
      workspace({
        "12-glossary.arc42.md": `# Glossary\n\nTerms.\n`,
        "01-introduction.arc42.md": `# Introduction and Goals\n\nHello.\n`,
      }),
    );
    const byFile = new Map(view.documents.map((document) => [document.file, document]));
    expect(
      byFile.get("12-glossary.arc42.md")!.outline.map((entry) => [entry.level, entry.status]),
    ).toEqual([
      [0, "removed"],
      [1, "unchanged"],
    ]);
    expect(byFile.get("01-introduction.arc42.md")!.outline.map((entry) => entry.status)).toEqual([
      "added",
    ]);

    const deleted = buildDiffView(
      workspace({ "01-introduction.arc42.md": `# Introduction and Goals\n\nHello.\n` }),
      workspace({}),
    );
    expect(deleted.documents[0]!.outline).toMatchObject([
      { title: "Introduction and Goals", status: "removed" },
    ]);
  });
});
