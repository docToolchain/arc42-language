// Parser subpath export for @arc42/core.
// Exports parser classes and the Parser interface for consumers (workspace-fs, tests).

export type { Parser } from "./markdown-parser.ts";
export { MarkdownParser } from "./markdown-parser.ts";
export { AsciidocParser } from "./asciidoc-parser.ts";
