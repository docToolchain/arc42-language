// AsciiDoc notation for @arc42/core, behind its own subpath
// (@arc42/core/notation/asciidoc) so `asciidoctor` (~1 MB) is bundled only where
// imported. The renderer lives in @cli42/lib/asciidoc; @asciidoctor/core
// resolves to its browser build in browser bundles.

import { AsciidocProseRenderer } from "@cli42/lib/asciidoc";
import { AsciidocParser } from "../../parser/asciidoc-parser.ts";
import type { Parser } from "../../parser/markdown-parser.ts";
import type { ProseRenderer } from "../prose-renderer.ts";
import type { NotationAdapter } from "../types.ts";

export { AsciidocProseRenderer };

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
