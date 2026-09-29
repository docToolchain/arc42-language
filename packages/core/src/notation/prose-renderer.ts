// ProseRenderer interface and renderProseNodes post-parse step, shared with
// the other *42 languages. Browser-safe — no Node.js imports.
//
// Two renderers exist, each behind its notation's subpath:
//  - MarkdownProseRenderer (@arc42/core/notation/markdown) — wraps marked.parse()
//  - AsciidocProseRenderer (@arc42/core/notation/asciidoc) — wraps asciidoctor load+convert

export { renderProseNodes } from "@cli42/lib/notation";
export type { ProseRenderer } from "@cli42/lib/notation";
