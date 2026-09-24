import type { ProseRenderer } from "@arc42/core";
import { marked } from "marked";

/**
 * Renders Markdown prose to an HTML fragment using marked.
 * Lives in @arc42/workspace-fs alongside AsciidocProseRenderer.
 * marked stays out of the browser bundle — the SPA reads pre-rendered renderedHtml.
 */
export class MarkdownProseRenderer implements ProseRenderer {
  renderProse(text: string): string {
    try {
      return marked.parse(text, { async: false }) as string;
    } catch {
      return `<p>${text}</p>`;
    }
  }
}
