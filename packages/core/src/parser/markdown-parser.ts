import { parseMarkdown as parseDialect } from "@cli42/lib/parser";
import type { Parser as NotationParser } from "@cli42/lib/notation";
import type { DocumentAst } from "../ast.ts";
import { ARC42_DIALECT } from "./dialect.ts";

/**
 * Line-oriented parser for .arc42.md files.
 * Parser is intentionally dumb — unknown block types are emitted as-is;
 * the meta-model builder rejects them.
 */
export function parseMarkdown(filePath: string, content: string): DocumentAst {
  return parseDialect(filePath, content, ARC42_DIALECT) as DocumentAst;
}

export type Parser = NotationParser<DocumentAst>;

export class MarkdownParser implements Parser {
  parse(filePath: string, content: string): DocumentAst {
    return parseMarkdown(filePath, content);
  }
}
