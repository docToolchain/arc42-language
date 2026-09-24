// Notation types — browser-safe, no Node.js imports.

import type { Parser } from "../parser/markdown-parser.ts";
import type { ProseRenderer } from "./prose-renderer.ts";

export type Notation = "markdown" | "asciidoc";

/**
 * Encapsulates all notation-specific behavior for a workspace.
 * Selected once at discovery time and flows through the processing pipeline.
 * Adding a third notation means implementing this interface — no scattered if-branches.
 */
export interface NotationAdapter {
  readonly notation: Notation;
  /** Full file suffix including the dot — ".arc42.md" or ".arc42.adoc" */
  readonly fileExtension: string;
  /** Human-readable fence description for W016 diagnostic messages */
  readonly fenceDescription: string;
  /** Returns true when the given filename belongs to this notation */
  matchesFile(filename: string): boolean;
  /** Construct the parser for this notation */
  createParser(): Parser;
  /** Construct the prose renderer for this notation */
  createProseRenderer(): ProseRenderer;
  /** Produce a canonical chapter filename, e.g. "01-introduction.arc42.md" */
  chapterFilename(number: number, slug: string): string;
}
