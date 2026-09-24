// Notation barrel export for @arc42/core.
// Only exports the interfaces and types — no implementations.
// Implementations (MarkdownNotationAdapter, AsciidocNotationAdapter) live in @arc42/workspace-fs
// so that neither marked nor asciidoctor enters the browser bundle.

export type { Notation, NotationAdapter } from "./types.ts";
export type { ProseRenderer } from "./prose-renderer.ts";
export { renderProseNodes } from "./prose-renderer.ts";
