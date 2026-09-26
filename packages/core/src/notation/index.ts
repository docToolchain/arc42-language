// Notation barrel export for @arc42/core.
// Only exports the interfaces and types — no implementations. The implementations
// live behind their own subpaths (@arc42/core/notation/markdown and
// @arc42/core/notation/asciidoc); loadNotationAdapter imports them on demand.

export type { Notation, NotationAdapter } from "./types.ts";
export type { ProseRenderer } from "./prose-renderer.ts";
export { renderProseNodes } from "./prose-renderer.ts";
