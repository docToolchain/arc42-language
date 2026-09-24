import { describe, expect, test } from "vite-plus/test";
import { loadWorkspaceFromDocuments } from "../src/arc42.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { diffWorkspaces } from "../src/workspace-diff.ts";

function workspace(files: Record<string, string>) {
  return loadWorkspaceFromDocuments(
    Object.entries(files).map(([file, content]) => parseMarkdown(file, content)),
  );
}

function block(type: string, attributes: Record<string, string>): string {
  const lines = Object.entries(attributes).map(([key, value]) => `${key}: ${value}`);
  return ["```arc42", `:::${type}`, ...lines, ":::", "```"].join("\n");
}

function service(
  prose = "The service owns orders.",
  attributes: Record<string, string> = { id: "service", title: "Service", technology: "Node" },
): string {
  return `# Building Block View\n\n## Service\n\n${prose}\n\n${block("building-block", attributes)}\n`;
}

const FILE = "05-building-blocks.arc42.md";

describe("diffWorkspaces — elements", () => {
  test("reports nothing for identical snapshots", () => {
    const diff = diffWorkspaces(workspace({ [FILE]: service() }), workspace({ [FILE]: service() }));
    expect(diff).toEqual({
      elements: [],
      diagrams: [],
      edges: [],
      proseSections: [],
      documents: [],
    });
  });

  test("reports attribute changes with old and new values", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({
        [FILE]: service(undefined, { id: "service", title: "Service", technology: "Go" }),
      }),
    );
    expect(diff.elements).toEqual([
      {
        id: "service",
        kind: "building-block",
        status: "modified",
        attributes: [{ name: "technology", before: "Node", after: "Go" }],
        proseChanged: false,
        base: { file: FILE, line: 8 },
        head: { file: FILE, line: 8 },
        section: { file: FILE, headingPath: ["Building Block View", "Service"], occurrence: 1 },
      },
    ]);
  });

  test("attaches a prose change to the block of the same section", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({
        [FILE]: service("The service owns orders and invoices.", {
          id: "service",
          title: "Service",
          technology: "Go",
        }),
      }),
    );
    expect(diff.elements[0]).toMatchObject({ status: "modified", proseChanged: true });
  });

  test("reports prose-only changes on an unchanged element", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({ [FILE]: service("The service owns orders and invoices.") }),
    );
    expect(diff.elements).toMatchObject([
      { id: "service", status: "unchanged", attributes: [], proseChanged: true },
    ]);
  });

  test("ignores reflowed prose, attribute order and list order", () => {
    const base = workspace({
      "08-concepts.arc42.md": `# Cross-cutting Concepts\n\n## Logging\n\nLogs.\n\n${block("concept", { id: "logging", title: "Logging" })}\n\n## Errors\n\nErrors.\n\n${block("concept", { id: "errors", title: "Errors" })}\n`,
      [FILE]: service("The service\nowns orders.", {
        id: "service",
        title: "Service",
        technology: "Node",
        implements: "logging, errors",
      }),
    });
    const head = workspace({
      "08-concepts.arc42.md": `# Cross-cutting Concepts\n\n## Logging\n\nLogs.\n\n${block("concept", { id: "logging", title: "Logging" })}\n\n## Errors\n\nErrors.\n\n${block("concept", { id: "errors", title: "Errors" })}\n`,
      [FILE]: service("The service   owns orders.", {
        technology: "Node",
        implements: "errors, logging",
        title: "Service",
        id: "service",
      }),
    });
    expect(diffWorkspaces(base, head).elements).toEqual([]);
  });

  test("an element added with its own new section has changed prose", () => {
    const head = `${service()}\n## Worker\n\nProcesses jobs.\n\n${block("building-block", { id: "worker", title: "Worker" })}\n`;
    const diff = diffWorkspaces(workspace({ [FILE]: service() }), workspace({ [FILE]: head }));
    expect(diff.elements).toMatchObject([
      { id: "worker", status: "added", proseChanged: true, head: { file: FILE } },
    ]);
    expect(diff.elements[0]?.base).toBeUndefined();
  });

  test("an element added to an unchanged section has unchanged prose", () => {
    const base = `# Building Block View\n\n## Worker\n\nProcesses jobs.\n`;
    const head = `${base}\n${block("building-block", { id: "worker", title: "Worker" })}\n`;
    const diff = diffWorkspaces(workspace({ [FILE]: base }), workspace({ [FILE]: head }));
    expect(diff.elements).toMatchObject([{ id: "worker", status: "added", proseChanged: false }]);
  });

  test("an element removed with its section has changed prose", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({ [FILE]: "# Building Block View\n" }),
    );
    expect(diff.elements).toMatchObject([
      { id: "service", status: "removed", proseChanged: true, base: { file: FILE, line: 8 } },
    ]);
  });

  test("an element removed while its prose stays has unchanged prose", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({ [FILE]: "# Building Block View\n\n## Service\n\nThe service owns orders.\n" }),
    );
    expect(diff.elements).toMatchObject([
      { id: "service", status: "removed", proseChanged: false },
    ]);
  });

  test("a renamed id is a removal plus an addition", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({
        [FILE]: service(undefined, { id: "order-service", title: "Service", technology: "Node" }),
      }),
    );
    expect(diff.elements.map((change) => [change.id, change.status])).toEqual([
      ["order-service", "added"],
      ["service", "removed"],
    ]);
  });

  test("a renamed heading counts as a prose change", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({ [FILE]: service().replace("## Service", "## Order Service") }),
    );
    expect(diff.elements).toMatchObject([
      {
        id: "service",
        status: "unchanged",
        proseChanged: true,
        section: { headingPath: ["Building Block View", "Order Service"] },
      },
    ]);
  });
});

describe("diffWorkspaces — edges, diagrams and prose sections", () => {
  const concepts = `# Cross-cutting Concepts\n\n## Logging\n\nLogs.\n\n${block("concept", { id: "logging", title: "Logging" })}\n`;

  test("reports added and removed relations", () => {
    const diff = diffWorkspaces(
      workspace({ "08-concepts.arc42.md": concepts, [FILE]: service() }),
      workspace({
        "08-concepts.arc42.md": concepts,
        [FILE]: service(undefined, {
          id: "service",
          title: "Service",
          technology: "Node",
          implements: "logging",
        }),
      }),
    );
    expect(diff.edges).toEqual([
      { status: "added", edge: { from: "service", to: "logging", relation: "implements" } },
    ]);
  });

  test("reports diagram source changes but ignores trailing whitespace", () => {
    const diagram = (source: string) =>
      `# Building Block View\n\n## Overview\n\nThe big picture.\n\n\`\`\`arc42\n:::diagram\nid: overview\nnotation: mermaid\n:::\n\`\`\`\n\`\`\`mermaid\n${source}\n\`\`\`\n`;
    const base = workspace({ [FILE]: diagram("flowchart LR\n  a --> b") });
    expect(
      diffWorkspaces(base, workspace({ [FILE]: diagram("flowchart LR  \n  a --> b   ") })).diagrams,
    ).toEqual([]);
    expect(
      diffWorkspaces(base, workspace({ [FILE]: diagram("flowchart LR\n  a --> c") })).diagrams,
    ).toMatchObject([
      {
        id: "overview",
        status: "modified",
        attributes: [{ name: "source", before: "flowchart LR\n  a --> b" }],
      },
    ]);
  });

  test("reports prose-only sections as added, modified and removed", () => {
    const base = `# Introduction and Goals\n\n## Purpose\n\nSells books.\n\n## Legacy\n\nOld notes.\n`;
    const head = `# Introduction and Goals\n\n## Purpose\n\nSells books and e-books.\n\n## Stakeholders\n\nReaders.\n`;
    const diff = diffWorkspaces(
      workspace({ "01-introduction.arc42.md": base }),
      workspace({ "01-introduction.arc42.md": head }),
    );
    expect(diff.proseSections.map((change) => [change.section.headingPath, change.status])).toEqual(
      [
        [["Introduction and Goals", "Purpose"], "modified"],
        [["Introduction and Goals", "Stakeholders"], "added"],
        [["Introduction and Goals", "Legacy"], "removed"],
      ],
    );
    expect(diff.documents).toEqual([
      { file: "01-introduction.arc42.md", added: 1, modified: 1, removed: 1 },
    ]);
  });

  test("sections that hold a block are reported through their elements only", () => {
    const diff = diffWorkspaces(
      workspace({ [FILE]: service() }),
      workspace({ [FILE]: service("Changed prose.") }),
    );
    expect(diff.proseSections).toEqual([]);
    expect(diff.elements).toHaveLength(1);
  });

  test("distinguishes sections with the same heading path by occurrence", () => {
    const base = `# Glossary\n\n## Notes\n\nFirst.\n\n## Notes\n\nSecond.\n`;
    const head = `# Glossary\n\n## Notes\n\nFirst.\n\n## Notes\n\nSecond, revised.\n`;
    const diff = diffWorkspaces(
      workspace({ "12-glossary.arc42.md": base }),
      workspace({ "12-glossary.arc42.md": head }),
    );
    expect(diff.proseSections).toMatchObject([
      { status: "modified", section: { headingPath: ["Glossary", "Notes"], occurrence: 2 } },
    ]);
  });
});

describe("diffWorkspaces — invalid snapshots fail loudly", () => {
  test("rejects duplicate element ids", () => {
    const duplicated = `${service()}\n## Copy\n\nCopy.\n\n${block("building-block", { id: "service", title: "Copy" })}\n`;
    expect(() =>
      diffWorkspaces(workspace({ [FILE]: service() }), workspace({ [FILE]: duplicated })),
    ).toThrow(/Duplicate id 'service' in head snapshot/);
  });

  test("rejects blocks outside any heading", () => {
    const outside = `${block("building-block", { id: "service", title: "Service" })}\n`;
    expect(() =>
      diffWorkspaces(workspace({ [FILE]: outside }), workspace({ [FILE]: service() })),
    ).toThrow(/05-building-blocks\.arc42\.md:2: block is not placed under any heading \(E017\)/);
  });
});
