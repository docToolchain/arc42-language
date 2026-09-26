// ProseRenderer interface and renderProseNodes post-parse step.
// Browser-safe — no Node.js imports.

import type { AstNode, DocumentAst } from "../ast.ts";

/**
 * Converts raw prose source text to an HTML fragment.
 * Two implementations exist, each behind its notation's subpath:
 *  - MarkdownProseRenderer (@arc42/core/notation/markdown) — wraps marked.parse()
 *  - AsciidocProseRenderer (@arc42/core/notation/asciidoc) — wraps asciidoctor load+convert
 *
 * renderProse may return a Promise to support async renderers (e.g. asciidoctor).
 * Callers use renderProseNodesAsync for document rendering.
 *
 * renderProse receives a BLOCK of consecutive prose lines joined by newlines,
 * not individual lines. Renderers must handle multi-line input correctly.
 */
export interface ProseRenderer {
  renderProse(text: string): string | Promise<string>;
}

/**
 * Post-parse step: walks all nodes in a DocumentAst and populates
 * ProseNode.renderedHtml for every prose node.
 * ProseNode.text is never modified — raw source is always preserved.
 *
 * Consecutive prose nodes are grouped and rendered together as a single block.
 * This ensures multi-line constructs (AsciiDoc tables, paragraphs with line
 * continuations, Markdown multi-line paragraphs) are rendered correctly.
 * The full rendered HTML is placed on the first node in each group;
 * subsequent nodes in the group receive an empty string so that
 * DocumentView's length-equality guard passes.
 */
export async function renderProseNodes(
  doc: DocumentAst,
  renderer: ProseRenderer,
): Promise<DocumentAst> {
  const nodes = doc.nodes;
  const result: AstNode[] = [];

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i]!;

    if (node.kind !== "prose") {
      result.push(node);
      i++;
      continue;
    }

    // Collect a run of consecutive prose nodes
    const runStart = i;
    while (i < nodes.length && nodes[i]!.kind === "prose") {
      i++;
    }
    const run = nodes.slice(runStart, i) as (typeof node)[];

    // Render the whole group as one block
    const block = run.map((n) => n.text).join("\n");
    const renderedHtml = await renderer.renderProse(block);

    // Assign the full HTML to the first node; subsequent nodes get ""
    // so DocumentView's `proseRendered.length === proseLines.length` guard passes
    for (let j = 0; j < run.length; j++) {
      result.push({ ...run[j]!, renderedHtml: j === 0 ? renderedHtml : "" });
    }
  }

  return { ...doc, nodes: result };
}
