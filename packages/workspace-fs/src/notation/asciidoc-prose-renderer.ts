import type { ProseRenderer } from "@arc42/core";
import { load } from "asciidoctor";

/**
 * Renders AsciiDoc prose to an HTML fragment using Asciidoctor.
 * Lives in @arc42/workspace-fs (Node.js only) — never imported by the browser bundle.
 *
 * Receives a BLOCK of consecutive prose lines joined by newlines (see renderProseNodes
 * in core). Multi-line constructs like AsciiDoc tables and cross-references are
 * rendered correctly because the full block is passed to Asciidoctor as one document.
 */
export class AsciidocProseRenderer implements ProseRenderer {
  async renderProse(text: string): Promise<string> {
    try {
      const doc = await load(text, {
        doctype: "article",
        safe: "safe",
        header_footer: false,
      });
      return (await doc.convert()) ?? "";
    } catch {
      // Fallback — wrap raw text in a paragraph
      return `<div class="paragraph"><p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>`;
    }
  }
}
