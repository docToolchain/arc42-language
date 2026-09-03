import { expect, test, describe } from "vite-plus/test";
import { validate } from "../src/validator/index.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";

function workspaceFromContent(filePath: string, content: string) {
  const doc = parseMarkdown(filePath, content);
  return buildWorkspace([doc]);
}

describe("W015 — missing or invalid arc42 chapter h1 heading", () => {
  test("NOT emitted for correct EN h1 on a numbered chapter file", () => {
    const content = `# Runtime View\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("NOT emitted for correct DE h1 on a numbered chapter file", () => {
    const content = `# Laufzeitsicht\n\nEtwas Inhalt.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("emitted when chapter file starts with h2 instead of h1", () => {
    const content = `## Runtime View\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
    expect(diags.find((d) => d.code === "W015")!.severity).toBe("warning");
  });

  test("emitted when h1 text is not a recognized arc42 chapter title", () => {
    const content = `# My Custom Title\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
  });

  test("emitted when h1 matches the wrong chapter number", () => {
    // File is chapter 06 but heading says chapter 01's title
    const content = `# Introduction and Goals\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
  });

  test("emitted when chapter file has no headings at all", () => {
    const content = `Just some prose with no heading.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(true);
  });

  test("NOT emitted for files without a numeric chapter prefix", () => {
    const content = `## Some Section\n\nContent without an h1.`;
    const ws = workspaceFromContent("building-blocks.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("NOT emitted for files not ending in .arc42.md", () => {
    const content = `## Some Section\n\nContent.`;
    const ws = workspaceFromContent("06-runtime-view.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("title matching is case-insensitive", () => {
    const content = `# runtime view\n\nSome content.`;
    const ws = workspaceFromContent("06-runtime-view.arc42.md", content);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W015")).toBe(false);
  });

  test("all 12 EN chapter titles are accepted", () => {
    const chapters: [string, string][] = [
      ["01-introduction-and-goals.arc42.md", "# Introduction and Goals"],
      ["02-architecture-constraints.arc42.md", "# Architecture Constraints"],
      ["03-system-scope-and-context.arc42.md", "# System Scope and Context"],
      ["04-solution-strategy.arc42.md", "# Solution Strategy"],
      ["05-building-block-view.arc42.md", "# Building Block View"],
      ["06-runtime-view.arc42.md", "# Runtime View"],
      ["07-deployment-view.arc42.md", "# Deployment View"],
      ["08-concepts.arc42.md", "# Cross-cutting Concepts"],
      ["09-decisions.arc42.md", "# Architecture Decisions"],
      ["10-quality-requirements.arc42.md", "# Quality Requirements"],
      ["11-risks.arc42.md", "# Risks and Technical Debt"],
      ["12-glossary.arc42.md", "# Glossary"],
    ];
    for (const [file, heading] of chapters) {
      const ws = workspaceFromContent(file, `${heading}\n\nSome content.`);
      const w015 = validate(ws, buildIndex(ws)).filter((d) => d.code === "W015");
      expect(w015, `Expected no W015 for ${file} with heading "${heading}"`).toHaveLength(0);
    }
  });

  test("all 12 DE chapter titles are accepted", () => {
    const chapters: [string, string][] = [
      ["01-einfuehrung.arc42.md", "# Einführung und Ziele"],
      ["02-randbedingungen.arc42.md", "# Randbedingungen"],
      ["03-kontext.arc42.md", "# Systemabgrenzung und Kontext"],
      ["04-loesungsstrategie.arc42.md", "# Lösungsstrategie"],
      ["05-bausteinsicht.arc42.md", "# Bausteinsicht"],
      ["06-laufzeitsicht.arc42.md", "# Laufzeitsicht"],
      ["07-verteilungssicht.arc42.md", "# Verteilungssicht"],
      ["08-konzepte.arc42.md", "# Querschnittliche Konzepte"],
      ["09-entscheidungen.arc42.md", "# Architekturentscheidungen"],
      ["10-qualitaet.arc42.md", "# Qualitätsanforderungen"],
      ["11-risiken.arc42.md", "# Risiken und technische Schulden"],
      ["12-glossar.arc42.md", "# Glossar"],
    ];
    for (const [file, heading] of chapters) {
      const ws = workspaceFromContent(file, `${heading}\n\nEtwas Inhalt.`);
      const w015 = validate(ws, buildIndex(ws)).filter((d) => d.code === "W015");
      expect(w015, `Expected no W015 for ${file} with heading "${heading}"`).toHaveLength(0);
    }
  });
});
