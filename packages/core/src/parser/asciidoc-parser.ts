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

/**
 * Line-oriented structural parser for .arc42.adoc files.
 *
 * AsciiDoc-specific syntax recognised:
 *   - Headings:      = Title (h1), == Title (h2), === Title (h3), etc.
 *   - DSL fence:     [source,arc42] followed by ---- on the next non-empty line
 *   - DSL blocks:    :::type / key: value / ::: (identical to Markdown)
 *   - Ignore directives: same :::ignore syntax inside an arc42 fence
 *   - Block comments: //// ... //// (multi-line; skipped)
 *   - Line comments:  // ... (skipped)
 *   - Bare mermaid:  [source,mermaid] + ---- ... ---- without a preceding :::diagram block
 *
 * Everything else is emitted as ProseNode with raw text.
 * renderedHtml is NOT populated here — AsciidocProseRenderer in workspace-fs handles that.
 */
export function parseAsciidoc(filePath: string, content: string): DocumentAst {
  const lines = content.split("\n");
  const nodes: AstNode[] = [];

  let inBlockComment = false; // //// ... ////
  let inArc42Fence = false; // [source,arc42] + ---- ... ----

  let openBlock: {
    blockType: string;
    attributes: Record<string, string>;
    startLine: number;
  } | null = null;

  let pendingDiagram: DiagramMetadata | null = null;
  let openDiagram: { metadata: DiagramMetadata; source: string[] } | null = null;
  let openBareMermaid: { source: string[]; startLine: number } | null = null;

  // State for arc42 fence detection: we saw [source,arc42] and are waiting for ----
  let pendingArc42FenceOpen = false;
  // State for mermaid fence detection
  let pendingMermaidFenceOpen = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i]!;

    // ── Block comments //// ... //// ─────────────────────────────────────────
    if (!inBlockComment) {
      if (line.trim() === "////") {
        inBlockComment = true;
        continue;
      }
    } else {
      if (line.trim() === "////") {
        inBlockComment = false;
      }
      continue;
    }

    // ── Line comments // ... ─────────────────────────────────────────────────
    if (/^\/\/(?!\/)/.test(line.trim())) {
      continue;
    }

    // ── Inside bare mermaid fence ─────────────────────────────────────────────
    if (openBareMermaid) {
      if (line.trim() === "----") {
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

    // ── Inside diagram source fence ───────────────────────────────────────────
    if (openDiagram) {
      if (line.trim() === "----") {
        nodes.push(createDiagramNode(openDiagram.metadata, openDiagram.source.join("\n"), lineNo));
        openDiagram = null;
      } else {
        openDiagram.source.push(line);
      }
      continue;
    }

    // ── Waiting for diagram source fence ─────────────────────────────────────
    if (pendingDiagram) {
      if (line.trim() === "") continue;
      // While waiting for diagram source, a closing arc42 fence comes first
      if (inArc42Fence && line.trim() === "----") {
        inArc42Fence = false;
        continue;
      }
      // Any [source,...] annotation followed by ---- opens the diagram source
      if (line.trim().startsWith("[source,")) {
        // Next ---- will be the diagram source fence
        openDiagram = { metadata: pendingDiagram, source: [] };
        pendingDiagram = null;
        // consume [source,...] line, next ---- opens the fence
        continue;
      }
      if (line.trim() === "----") {
        openDiagram = { metadata: pendingDiagram, source: [] };
        pendingDiagram = null;
        continue;
      }
      nodes.push(createDiagramNode(pendingDiagram, "", pendingDiagram.startLine));
      pendingDiagram = null;
    }

    // ── Arc42 fence: [source,arc42] + ---- opens; ---- closes ────────────────
    if (!openDiagram && !pendingDiagram && !openBareMermaid) {
      if (/^\[source,\s*arc42\s*\]/.test(line.trim())) {
        pendingArc42FenceOpen = true;
        continue;
      }
      if (/^\[source,\s*mermaid[a-zA-Z0-9_-]*\s*\]/.test(line.trim())) {
        pendingMermaidFenceOpen = true;
        continue;
      }
      if (pendingArc42FenceOpen && line.trim() === "----") {
        pendingArc42FenceOpen = false;
        inArc42Fence = true;
        continue;
      }
      if (pendingMermaidFenceOpen && line.trim() === "----") {
        pendingMermaidFenceOpen = false;
        if (!inArc42Fence) {
          openBareMermaid = { source: [], startLine: lineNo };
        }
        continue;
      }
      // Reset pending if non-empty line interrupts
      if (pendingArc42FenceOpen && line.trim() !== "") {
        pendingArc42FenceOpen = false;
      }
      if (pendingMermaidFenceOpen && line.trim() !== "") {
        pendingMermaidFenceOpen = false;
      }
      // Closing arc42 fence
      if (inArc42Fence && line.trim() === "----") {
        inArc42Fence = false;
        continue;
      }
    }

    // ── Open DSL block ────────────────────────────────────────────────────────
    if (openBlock !== null) {
      if (/^:::\s*$/.test(line)) {
        if (openBlock.blockType === "diagram" && inArc42Fence) {
          pendingDiagram = {
            id: openBlock.attributes["id"] ?? "",
            scenario: openBlock.attributes["scenario"] ?? "",
            view: openBlock.attributes["view"],
            notation: openBlock.attributes["notation"] ?? "",
            roots: splitList(openBlock.attributes["roots"]),
            aliases: openBlock.attributes["aliases"] ?? "",
            startLine: openBlock.startLine,
          };
        } else if (openBlock.blockType === "ignore") {
          nodes.push({
            kind: "ignore",
            ruleCode: "",
            reason: undefined,
            startLine: openBlock.startLine,
            endLine: lineNo,
          });
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
      const attrMatch = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
      if (attrMatch) {
        openBlock.attributes[attrMatch[1]!] = attrMatch[2]!;
      }
      continue;
    }

    // ── Single-line ignore directive ──────────────────────────────────────────
    if (inArc42Fence) {
      const singleLineIgnore = /^:::ignore\s+([^:\s]+)(?:\s+(.*?))?\s*:::\s*$/.exec(line);
      if (singleLineIgnore) {
        nodes.push({
          kind: "ignore",
          ruleCode: singleLineIgnore[1]!,
          reason: singleLineIgnore[2] ? singleLineIgnore[2].trim() : undefined,
          startLine: lineNo,
          endLine: lineNo,
        });
        continue;
      }
    }

    // ── Opening DSL block: :::type ────────────────────────────────────────────
    const openMatch = /^:::([a-z][a-z0-9-]*)\s*$/.exec(line);
    if (openMatch) {
      openBlock = {
        blockType: openMatch[1]!,
        attributes: {},
        startLine: lineNo,
      };
      continue;
    }

    // ── AsciiDoc headings: = Title (h1), == Title (h2), etc. ─────────────────
    const headingMatch = /^(={1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      nodes.push({
        kind: "heading",
        level: headingMatch[1]!.length,
        text: headingMatch[2]!.trim(),
        line: lineNo,
      });
      continue;
    }

    // ── Everything else: prose ────────────────────────────────────────────────
    nodes.push({ kind: "prose", text: line, line: lineNo });
  }

  // Unclosed block at EOF
  if (openBlock !== null) {
    nodes.push({
      kind: "block",
      blockType: "__parse_error__",
      attributes: {
        message: `Unclosed block ':::${openBlock.blockType}' opened at line ${openBlock.startLine} — missing closing ':::'`,
        startLine: String(openBlock.startLine),
      },
      startLine: openBlock.startLine,
      endLine: lines.length,
      inArc42Fence,
    });
  }

  if (pendingDiagram) {
    nodes.push(createDiagramNode(pendingDiagram, "", pendingDiagram.startLine));
  }

  return { filePath, nodes };
}

export class AsciidocParser {
  parse(filePath: string, content: string): DocumentAst {
    return parseAsciidoc(filePath, content);
  }
}
