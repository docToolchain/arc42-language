// The Mermaid syntax boundary of @cli42/lib, with the notations arc42 checks.
import type { MermaidGrammar } from "@cli42/lib/mermaid";

/** Mermaid notation understood by the arc42 syntax boundary. */
export type MermaidNotation = MermaidGrammar;

export type {
  MermaidParseFailure,
  MermaidParseRequest,
  MermaidParseResult,
  MermaidParseSuccess,
  MermaidSyntaxParser,
} from "@cli42/lib/mermaid";
export { mermaidSyntaxParser, parseMermaid, warmMermaid } from "@cli42/lib/mermaid";
