import { parseMarkdown as parseDialect } from "@cli42/lib/parser";
import type { MarkdownDialect } from "@cli42/lib/parser";
import type { Parser as NotationParser } from "@cli42/lib/notation";
import type { DiagramNode, DocumentAst } from "../ast.ts";
import { createDiagramNode } from "./diagram-node.ts";

/** The arc42 dialect of the shared Markdown notation: ```arc42 fences. */
const ARC42_MARKDOWN: MarkdownDialect<DiagramNode, "inArc42Fence"> = {
  fences: ["arc42"],
  fenceFlag: "inArc42Fence",
  createDiagram: createDiagramNode,
};

/**
 * Line-oriented parser for .arc42.md files.
 * Parser is intentionally dumb — unknown block types are emitted as-is;
 * the meta-model builder rejects them.
 */
export function parseMarkdown(filePath: string, content: string): DocumentAst {
  return parseDialect(filePath, content, ARC42_MARKDOWN) as DocumentAst;
}

export type Parser = NotationParser<DocumentAst>;

export class MarkdownParser implements Parser {
  parse(filePath: string, content: string): DocumentAst {
    return parseMarkdown(filePath, content);
  }
}
