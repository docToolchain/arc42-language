import type { DocumentAst, AstNode, DiagramNode, BareMermaidNode } from "../ast.ts";

interface IgnoreMetadata {
  ruleCode: string;
  reason?: string;
  startLine: number;
}

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

  let pendingIgnore: IgnoreMetadata | null = null;
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
      // A diagram metadata block is closed before its Mermaid source fence.
      // While waiting for that source, the first bare fence is the enclosing
      // ```arc42 fence, not the diagram source itself.
      if (inArc42Fence && /^```\s*$/.test(line)) {
        inArc42Fence = false;
        continue;
      }
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

    if (pendingIgnore) {
      // Multi-line ignore directive: look for closing :::
      if (/^:::\s*$/.test(line)) {
        nodes.push({
          kind: "ignore",
          ruleCode: pendingIgnore.ruleCode,
          reason: pendingIgnore.reason,
          startLine: pendingIgnore.startLine,
          endLine: lineNo,
        });
        pendingIgnore = null;
        continue;
      }
      // Line contains rule code and/or reason - extract it
      // The line should be: ruleCode [reason] (without the :::: prefix)
      const contentMatch = /^([^:\s]+)(?:\s+(.*?))?\s*$/.exec(line);
      if (contentMatch) {
        // Verify it looks like a rule code (starts with letter/number, may contain dots)
        if (/^[a-zA-Z0-9]+[a-zA-Z0-9-]*$/.test(contentMatch[1])) {
          pendingIgnore.ruleCode = contentMatch[1]!;
          pendingIgnore.reason = contentMatch[2] ? contentMatch[2].trim() : undefined;
        } else {
          // Not a valid rule code: retain an inert node rather than silently
          // dropping the malformed source line.
          nodes.push({
            kind: "ignore",
            ruleCode: "",
            startLine: pendingIgnore.startLine,
            endLine: pendingIgnore.startLine,
          });
          pendingIgnore = null;
        }
      } else {
        nodes.push({
          kind: "ignore",
          ruleCode: "",
          startLine: pendingIgnore.startLine,
          endLine: pendingIgnore.startLine,
        });
        pendingIgnore = null;
      }
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
          // Multi-line ignore directive (shouldn't happen with single-line syntax)
          // Emit as ignore node with no content
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

      // Attribute line: key: value
      const attrMatch = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
      if (attrMatch) {
        openBlock.attributes[attrMatch[1]!] = attrMatch[2]!;
      }
      // Other lines inside block are ignored (future prose extension)
      continue;
    }

    // Opening fence: :::type or single-line directive like :::ignore RULE [reason] :::
    // Check for single-line ignore directive first (entire directive on one line)
    // This matches the complete directive on one line.
    const singleLineIgnore = inArc42Fence
      ? /^:::ignore\s+([^:\s]+)(?:\s+(.*?))?\s*:::\s*$/.exec(line)
      : null;
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
    // Check for bare/malformed ignore (opening but no rule code) with closing on same line
    if (inArc42Fence && /^:::ignore\s*:::$/.test(line)) {
      nodes.push({
        kind: "ignore",
        ruleCode: "",
        reason: undefined,
        startLine: lineNo,
        endLine: lineNo,
      });
      continue;
    }

    // A bare ignore marker outside an arc42 fence is ordinary Markdown, not an
    // unknown architecture block and therefore must not create a parse error.
    if (!inArc42Fence && /^:::ignore\s*$/.test(line)) {
      nodes.push({ kind: "prose", text: line, line: lineNo });
      continue;
    }

    // Opening fence: :::type or single-line directive
    // Check for ignore directive first (before general :::type pattern)
    // Only recognize ignore directives inside arc42 fence
    if (inArc42Fence && line.startsWith(":::ignore")) {
      // Single-line directive: :::ignore RULE [reason] :::
      const singleLineMatch = /^:::ignore\s+([^:\s]+)(?:\s+(.*?))?\s*:::/.exec(line);
      if (singleLineMatch) {
        nodes.push({
          kind: "ignore",
          ruleCode: singleLineMatch[1]!,
          reason: singleLineMatch[2] ? singleLineMatch[2].trim() : undefined,
          startLine: lineNo,
          endLine: lineNo,
        });
        continue;
      }
      // Bare/malformed directive: :::ignore (no rule code, no closing)
      const bareMatch = /^:::ignore\s*$/.exec(line);
      if (bareMatch) {
        pendingIgnore = {
          ruleCode: "",
          reason: undefined,
          startLine: lineNo,
        };
        continue;
      }
      // Multi-line directive opening: :::ignore RULE [reason] (no closing :::)
      const multiLineMatch = /^:::ignore\s+([^:\s]+)(?:\s+(.*?))?\s*$/.exec(line);
      if (multiLineMatch) {
        pendingIgnore = {
          ruleCode: multiLineMatch[1]!,
          reason: multiLineMatch[2] ? multiLineMatch[2].trim() : undefined,
          startLine: lineNo,
        };
        continue;
      }
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

    // Prose: emit all lines outside blocks, including blank lines.
    // Blank lines must be preserved so that marked receives the correct
    // paragraph/table boundaries (e.g. a blank line between a table and the
    // following paragraph prevents marked from absorbing the paragraph as a
    // table row in its first column).
    nodes.push({ kind: "prose", text: line, line: lineNo });
  }

  // Unclosed block: silently ignored (validator will catch missing required attrs)

  // Process any pending diagram at EOF (diagram block was closed but no fence followed)
  if (pendingDiagram) {
    nodes.push(createDiagramNode(pendingDiagram, "", pendingDiagram.startLine));
  }

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
