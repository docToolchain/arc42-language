import React, { useMemo } from "react";
import type { AstNode, ProseNode, BlockNode, Element, Edge, DocumentAst } from "./types";
import { AstNodeRenderer } from "./AstNodeRenderer";

interface DocumentViewProps {
  documents: DocumentAst[];
  viewMode: "human" | "agent";
  elementsMap: Map<string, Element>;
  edges: Edge[];
  activeDocIndex: number;
}

/**
 * A render group is either:
 * - A single non-prose, non-arc42-block node (heading, diagram, plain code block)
 * - A prose run: one or more consecutive ProseNodes merged into a single string,
 *   optionally followed by an arc42 BlockNode that is "attached" to that prose.
 *
 * Grouping is required for two reasons:
 *   1. Tables: the parser emits one ProseNode per source line. If each line is
 *      rendered independently, table rows never assemble into a <table>. Merging
 *      the run and passing the full text to marked restores table rendering.
 *   2. Collapsible cards: the arc42 BlockNode that follows a prose paragraph
 *      should be attached to it — the prose gets a clickable stripe that
 *      expands/collapses the element card below.
 */
type RenderGroup =
  | { kind: "prose-run"; text: string; block: BlockNode | null }
  | { kind: "other"; node: AstNode };

function groupNodes(nodes: AstNode[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let proseLines: string[] = [];
  let i = 0;

  function flushProse(attachedBlock: BlockNode | null) {
    if (proseLines.length === 0 && !attachedBlock) return;
    groups.push({
      kind: "prose-run",
      text: proseLines.join("\n"),
      block: attachedBlock,
    });
    proseLines = [];
  }

  while (i < nodes.length) {
    const node = nodes[i]!;

    if (node.kind === "prose") {
      proseLines.push((node as ProseNode).text);
      i++;

      // Peek ahead: if the next node is an arc42 BlockNode, attach it
      const next = nodes[i];
      if (next && next.kind === "block" && (next as BlockNode).inArc42Fence) {
        flushProse(next as BlockNode);
        i++; // consume the block too
      }
      // Otherwise keep accumulating prose lines — they'll be flushed when
      // a non-prose node is encountered or at end-of-document
      continue;
    }

    // Non-prose node encountered — flush any pending prose first (no attached block)
    if (proseLines.length > 0) {
      flushProse(null);
    }

    if (node.kind === "block" && (node as BlockNode).inArc42Fence) {
      // arc42 block with no preceding prose — emit as prose-run with empty text
      groups.push({ kind: "prose-run", text: "", block: node as BlockNode });
    } else {
      groups.push({ kind: "other", node });
    }
    i++;
  }

  // Flush any remaining prose lines
  if (proseLines.length > 0) {
    flushProse(null);
  }

  return groups;
}

export function DocumentView({
  documents,
  viewMode,
  elementsMap,
  edges,
  activeDocIndex,
}: DocumentViewProps) {
  const doc = documents[activeDocIndex];
  if (!doc) return <div className="doc-empty">No document selected.</div>;

  const groups = useMemo(() => groupNodes(doc.nodes), [doc]);

  return (
    <article className="document-view">
      {groups.map((group, i) => {
        if (group.kind === "other") {
          return (
            <AstNodeRenderer
              key={i}
              node={group.node}
              viewMode={viewMode}
              elementsMap={elementsMap}
              edges={edges}
            />
          );
        }
        // prose-run (with optional attached arc42 block)
        return (
          <AstNodeRenderer
            key={i}
            node={{ kind: "prose-run", text: group.text, block: group.block } as AstNode}
            viewMode={viewMode}
            elementsMap={elementsMap}
            edges={edges}
          />
        );
      })}
    </article>
  );
}
