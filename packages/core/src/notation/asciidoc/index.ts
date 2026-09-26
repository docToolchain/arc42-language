// AsciiDoc notation for @arc42/core, behind its own subpath
// (@arc42/core/notation/asciidoc) so `asciidoctor` (~1 MB) is bundled only where
// imported. @asciidoctor/core resolves to its browser build in browser bundles.

import { load } from "@asciidoctor/core";
import { AsciidocParser } from "../../parser/asciidoc-parser.ts";
import type { Parser } from "../../parser/markdown-parser.ts";
import type { ProseRenderer } from "../prose-renderer.ts";
import type { NotationAdapter } from "../types.ts";

/**
 * Renders AsciiDoc prose to an HTML fragment using Asciidoctor. Errors are raised.
 *
 * Receives a BLOCK of consecutive prose lines joined by newlines (see
 * renderProseNodes). Multi-line constructs like AsciiDoc tables and
 * cross-references are rendered correctly because the full block is passed to
 * Asciidoctor as one document.
 */
export class AsciidocProseRenderer implements ProseRenderer {
  async renderProse(text: string): Promise<string> {
    const doc = await load(text, { doctype: "article", safe: "safe", header_footer: false });
    return (await doc.convert()) ?? "";
  }
}

/** NotationAdapter for AsciiDoc (.arc42.adoc) workspaces. */
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
