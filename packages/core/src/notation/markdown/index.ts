// Markdown notation for @arc42/core, behind its own subpath
// (@arc42/core/notation/markdown) so `marked` is bundled only where imported.

import type { Parser } from "../../parser/markdown-parser.ts";
import { MarkdownParser } from "../../parser/markdown-parser.ts";
import { MarkdownProseRenderer } from "@cli42/lib/markdown";
import type { ProseRenderer } from "../prose-renderer.ts";
import type { NotationAdapter } from "../types.ts";

export { MarkdownProseRenderer } from "@cli42/lib/markdown";

/** NotationAdapter for Markdown (.arc42.md) workspaces. */
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
