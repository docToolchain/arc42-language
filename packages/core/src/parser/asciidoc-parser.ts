import { parseAsciidoc as parseDialect } from "@cli42/lib/parser";
import type { DocumentAst } from "../ast.ts";
import { ARC42_DIALECT } from "./dialect.ts";
import type { Parser } from "./markdown-parser.ts";

/**
 * Line-oriented parser for .arc42.adoc files: the shared DSL in [source,arc42]
 * + ---- fences, AsciiDoc headings (= … ======) and comments (//, ////).
 * renderedHtml is NOT populated here — AsciidocProseRenderer handles that.
 */
export function parseAsciidoc(filePath: string, content: string): DocumentAst {
  return parseDialect(filePath, content, ARC42_DIALECT) as DocumentAst;
}

export class AsciidocParser implements Parser {
  parse(filePath: string, content: string): DocumentAst {
    return parseAsciidoc(filePath, content);
  }
}
