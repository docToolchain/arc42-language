import type { DocumentAst, AstNode, DiagramNode, BareMermaidNode } from "../ast.ts";

interface DiagramMetadata {
  id: string;
  scenario?: string;
  view?: string;
  notation: string;
  roots: string[];
  aliases: string;
  startLine: number;
}

function splitList(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createDiagramNode(
  metadata: DiagramMetadata,
  source: string,
  endLine: number,
): DiagramNode {
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

/**
 * Line-oriented parser for .arc42.md files.
 * Parser is intentionally dumb — unknown block types are emitted as-is;
 * the meta-model builder rejects them.
 */
export function parseMarkdown(filePath: string, content: string): DocumentAst {
  const lines = content.split("\n");
  const nodes: AstNode[] = [];

  let openBlock: {
    blockType: string;
    attributes: Record<string, string>;
    startLine: number;
  } | null = null;

  let pendingDiagram: DiagramMetadata | null = null;
  let openDiagram: {
    metadata: DiagramMetadata;
    source: string[];
  } | null = null;
  let openBareMermaid: { source: string[]; startLine: number } | null = null;

  let inHtmlComment = false;
  let inArc42Fence = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1; // 1-indexed
    const line = lines[i]!;

    // Track HTML comment blocks (<!-- ... -->) and skip their contents.
    // This allows template guidance to include example :::blocks without them being parsed.
    // Handle both single-line (<!-- foo -->) and multi-line comments.
    if (!inHtmlComment) {
      const openIdx = line.indexOf("<!--");
      if (openIdx !== -1) {
        const closeIdx = line.indexOf("-->", openIdx + 4);
        if (closeIdx === -1) {
          // Opens but does not close on this line — enter comment mode
          inHtmlComment = true;
        }
        // Skip this line regardless (comment open on this line)
        continue;
      }
    } else {
      if (line.includes("-->")) {
        inHtmlComment = false;
      }
      continue;
    }

    if (openBareMermaid) {
      if (/^```\s*$/.test(line)) {
        const node: BareMermaidNode = {
          kind: "bare-mermaid",
          source: openBareMermaid.source.join("\n"),
          startLine: openBareMermaid.startLine,
          endLine: lineNo,
        };
        nodes.push(node);
        openBareMermaid = null;
      } else {
        openBareMermaid.source.push(line);
      }
      continue;
    }

    if (openDiagram) {
      if (/^```\s*$/.test(line)) {
        nodes.push(createDiagramNode(openDiagram.metadata, openDiagram.source.join("\n"), lineNo));
        openDiagram = null;
      } else {
        openDiagram.source.push(line);
      }
      continue;
    }

    if (pendingDiagram) {
      if (line.trim() === "") continue;
      const fenceMatch = /^```([a-zA-Z0-9_-]+)?\s*$/.exec(line);
      if (fenceMatch) {
        // Opening fence of the diagram source — do NOT include it in source.
        openDiagram = { metadata: pendingDiagram, source: [] };
        pendingDiagram = null;
        continue;
      }
      nodes.push(createDiagramNode(pendingDiagram, "", pendingDiagram.startLine));
      pendingDiagram = null;
    }

    // arc42 fence: ```arc42 ... ``` wraps :::blocks for Markdown renderer compatibility.
    // Only recognised outside diagram states to avoid conflicting with the diagram source fence.
    if (!openDiagram && !pendingDiagram && !openBareMermaid) {
      if (/^```arc42\s*$/.test(line)) {
        inArc42Fence = true;
        continue;
      }
      if (inArc42Fence && /^```\s*$/.test(line)) {
        inArc42Fence = false;
        continue;
      }

      // Bare Mermaid fenced block (no preceding :::diagram block).
      // Emit as BareMermaidNode so the renderer can still display it,
      // and the validator (W017) can warn about the missing :::diagram block.
      const bareMermaidMatch = /^```(mermaid[a-zA-Z0-9_-]*)\s*$/.exec(line);
      if (bareMermaidMatch && !inArc42Fence) {
        openBareMermaid = { source: [], startLine: lineNo };
        continue;
      }
    }

    if (openBlock !== null) {
      // Closing fence: ::: optionally followed only by whitespace
      if (/^:::\s*$/.test(line)) {
        if (openBlock.blockType === "diagram") {
          pendingDiagram = {
            id: openBlock.attributes["id"] ?? "",
            scenario: openBlock.attributes["scenario"] ?? "",
            view: openBlock.attributes["view"],
            notation: openBlock.attributes["notation"] ?? "",
            roots: splitList(openBlock.attributes["roots"]),
            aliases: openBlock.attributes["aliases"] ?? "",
            startLine: openBlock.startLine,
          };
        } else {
          nodes.push({
            kind: "block",
            blockType: openBlock.blockType,
            attributes: openBlock.attributes,
            startLine: openBlock.startLine,
            endLine: lineNo,
            inArc42Fence,
          });
        }
        openBlock = null;
        continue;
      }

      // Attribute line: key: value
      const attrMatch = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
      if (attrMatch) {
        openBlock.attributes[attrMatch[1]!] = attrMatch[2]!;
      }
      // Other lines inside block are ignored (future prose extension)
      continue;
    }

    // Opening fence: :::type
    const openMatch = /^:::([a-z][a-z0-9-]*)\s*$/.exec(line);
    if (openMatch) {
      openBlock = {
        blockType: openMatch[1]!,
        attributes: {},
        startLine: lineNo,
      };
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      nodes.push({
        kind: "heading",
        level: headingMatch[1]!.length,
        text: headingMatch[2]!.trim(),
        line: lineNo,
      });
      continue;
    }

    // Prose (non-empty lines outside blocks)
    if (line.trim().length > 0) {
      nodes.push({ kind: "prose", text: line, line: lineNo });
    }
  }

  // Unclosed block: silently ignored (validator will catch missing required attrs)

  return { filePath, nodes };
}

export interface Parser {
  parse(filePath: string, content: string): DocumentAst;
}

export class MarkdownParser implements Parser {
  parse(filePath: string, content: string): DocumentAst {
    return parseMarkdown(filePath, content);
  }
}
