import type { NotationAdapter, ProseRenderer } from "@arc42/core";
import type { Parser } from "@arc42/core";
import { AsciidocParser } from "@arc42/core";
import { AsciidocProseRenderer } from "./asciidoc-prose-renderer.ts";

/**
 * NotationAdapter for AsciiDoc (.arc42.adoc) workspaces.
 * Lives in @arc42/workspace-fs (Node.js only) — never imported by the browser bundle.
 */
export class AsciidocNotationAdapter implements NotationAdapter {
  readonly notation = "asciidoc" as const;
  readonly fileExtension = ".arc42.adoc";
  readonly fenceDescription = "[source,arc42] / ---- fence";

  matchesFile(filename: string): boolean {
    return filename.endsWith(".arc42.adoc");
  }

  createParser(): Parser {
    return new AsciidocParser();
  }

  createProseRenderer(): ProseRenderer {
    return new AsciidocProseRenderer();
  }

  chapterFilename(number: number, slug: string): string {
    return `${String(number).padStart(2, "0")}-${slug}.arc42.adoc`;
  }
}
