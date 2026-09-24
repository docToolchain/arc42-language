import type { NotationAdapter, Notation, ProseRenderer } from "@arc42/core";
import type { Parser } from "@arc42/core";
import { MarkdownParser } from "@arc42/core";
import { MarkdownProseRenderer } from "./markdown-prose-renderer.ts";
import { AsciidocNotationAdapter } from "./asciidoc-adapter.ts";

/**
 * NotationAdapter for Markdown (.arc42.md) workspaces.
 * Lives in @arc42/workspace-fs alongside the AsciidocNotationAdapter so that
 * both implementations share the same module boundary.
 */
export class MarkdownNotationAdapter implements NotationAdapter {
  readonly notation = "markdown" as const;
  readonly fileExtension = ".arc42.md";
  readonly fenceDescription = "```arc42 fence";

  matchesFile(filename: string): boolean {
    return filename.endsWith(".arc42.md");
  }

  createParser(): Parser {
    return new MarkdownParser();
  }

  createProseRenderer(): ProseRenderer {
    return new MarkdownProseRenderer();
  }

  chapterFilename(number: number, slug: string): string {
    return `${String(number).padStart(2, "0")}-${slug}.arc42.md`;
  }
}

export { AsciidocNotationAdapter } from "./asciidoc-adapter.ts";

/**
 * Factory: returns the appropriate NotationAdapter for the detected notation.
 * This is the single runtime entry point used by workspace-fs functions.
 */
export function createAdapterForNotation(notation: Notation): NotationAdapter {
  if (notation === "asciidoc") return new AsciidocNotationAdapter();
  return new MarkdownNotationAdapter();
}
