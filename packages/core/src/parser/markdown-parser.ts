import type { DocumentAst, AstNode } from "../ast.ts";

/**
 * Line-oriented parser for .arc42.md files.
 * Parser is intentionally dumb — unknown block types are emitted as-is;
 * the meta-model builder rejects them.
 */
export function parseMarkdown(
  filePath: string,
  content: string,
): DocumentAst {
  const lines = content.split("\n");
  const nodes: AstNode[] = [];

  let openBlock: {
    blockType: string;
    attributes: Record<string, string>;
    startLine: number;
  } | null = null;

  let inHtmlComment = false;

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

    if (openBlock !== null) {
      // Closing fence: ::: optionally followed only by whitespace
      if (/^:::\s*$/.test(line)) {
        nodes.push({
          kind: "block",
          blockType: openBlock.blockType,
          attributes: openBlock.attributes,
          startLine: openBlock.startLine,
          endLine: lineNo,
        });
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
