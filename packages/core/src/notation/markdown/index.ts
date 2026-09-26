// Markdown notation for @arc42/core, behind its own subpath
// (@arc42/core/notation/markdown) so `marked` is bundled only where imported.

import { marked } from "marked";
import type { Parser } from "../../parser/markdown-parser.ts";
import { MarkdownParser } from "../../parser/markdown-parser.ts";
import type { ProseRenderer } from "../prose-renderer.ts";
import type { NotationAdapter } from "../types.ts";

/** Renders Markdown prose to an HTML fragment using marked. Errors are raised. */
export class MarkdownProseRenderer implements ProseRenderer {
  renderProse(text: string): string {
    return marked.parse(text, { async: false }) as string;
  }
}

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
