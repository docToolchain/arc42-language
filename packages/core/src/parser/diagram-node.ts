import type { DiagramMetadata as RawDiagramMetadata } from "@cli42/lib/parser";
import type { DiagramNode } from "../ast.ts";

function splitList(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Build the typed diagram node of a `:::diagram` block from its attributes and
 * source: the view (or the sequence notation) selects the diagram type.
 * Shared by the Markdown and AsciiDoc parsers.
 */
export function createDiagramNode(
  { attributes, startLine }: RawDiagramMetadata,
  source: string,
  endLine: number,
): DiagramNode {
  const metadata = {
    id: attributes["id"] ?? "",
    scenario: attributes["scenario"] ?? "",
    view: attributes["view"],
    notation: attributes["notation"] ?? "",
    roots: splitList(attributes["roots"]),
    aliases: attributes["aliases"] ?? "",
    startLine,
  };
  if (metadata.view === "building-block") {
    return {
      kind: "diagram",
      diagramType: "building-block",
      view: "building-block",
      id: metadata.id,
      notation: metadata.notation,
      roots: metadata.roots,
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  if (metadata.view === "context") {
    return {
      kind: "diagram",
      diagramType: "context",
      view: "context",
      id: metadata.id,
      notation: metadata.notation,
      roots: metadata.roots,
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  if (metadata.view === "deployment") {
    return {
      kind: "diagram",
      diagramType: "deployment",
      view: "deployment",
      id: metadata.id,
      notation: metadata.notation,
      roots: metadata.roots,
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  if (metadata.notation === "mermaid-sequence") {
    return {
      kind: "diagram",
      diagramType: "sequence",
      id: metadata.id,
      scenario: metadata.scenario ?? "",
      notation: "mermaid-sequence",
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  return {
    kind: "diagram",
    diagramType: "generic",
    id: metadata.id,
    notation: metadata.notation,
    aliases: metadata.aliases,
    source,
    startLine: metadata.startLine,
    endLine,
  };
}
