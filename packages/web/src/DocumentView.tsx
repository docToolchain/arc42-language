import React, { useMemo } from "react";
import styles from "./DocumentView.module.css";
import type {
  AstNode,
  ProseNode,
  IgnoreNode,
  BlockNode,
  HeadingNode,
  Element,
  Edge,
  DocumentAst,
} from "./types";
import { AstNodeRenderer } from "./AstNodeRenderer";
import { ChapterDiff } from "./ChapterDiff";
import type { DiffDocument } from "./types";
import { filename } from "./utils";

interface DocumentViewProps {
  documents: DocumentAst[];
  viewMode: "human" | "agent";
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
  edges: Edge[];
  activeDocIndex: number;
  targetElementId: string | null;
  onTargetConsumed: () => void;
  /** Changed documents of a visualized difference, by file name: shown with inline changes. */
  diffDocuments?: Map<string, DiffDocument>;
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
  | {
      kind: "prose-run";
      text: string;
      renderedHtml?: string;
      block: BlockNode | null;
      ignores: IgnoreNode[];
    }
  | { kind: "other"; node: AstNode };

export function groupNodes(nodes: AstNode[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let proseLines: string[] = [];
  let proseRendered: string[] = [];
  let pendingIgnores: IgnoreNode[] = [];
  let i = 0;

  function flushProse(attachedBlock: BlockNode | null, ignores = pendingIgnores) {
    if (proseLines.length === 0 && !attachedBlock) return;
    // Use pre-rendered HTML when all prose nodes in this run were server-rendered
    const renderedHtml =
      proseRendered.length === proseLines.length && proseRendered.length > 0
        ? proseRendered.join("")
        : undefined;
    groups.push({
      kind: "prose-run",
      text: proseLines.join("\n"),
      renderedHtml,
      block: attachedBlock,
      ignores,
    });
    proseLines = [];
    proseRendered = [];
    if (attachedBlock) pendingIgnores = [];
  }

  while (i < nodes.length) {
    const node = nodes[i]!;

    if (node.kind === "prose") {
      const proseNode = node as ProseNode;
      proseLines.push(proseNode.text);
      if (proseNode.renderedHtml !== undefined) {
        proseRendered.push(proseNode.renderedHtml);
      }
      i++;

      // Ignore directives between prose and its block belong to that card.
      while (nodes[i]?.kind === "ignore") {
        pendingIgnores.push(nodes[i] as IgnoreNode);
        i++;
      }
      const next = nodes[i];
      if (next && next.kind === "block" && (next as BlockNode).inArc42Fence) {
        flushProse(next as BlockNode, pendingIgnores);
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

    if (node.kind === "ignore") {
      pendingIgnores.push(node as IgnoreNode);
      i++;
      continue;
    }

    if (node.kind === "block" && (node as BlockNode).inArc42Fence) {
      // arc42 block with no preceding prose — emit as prose-run with empty text
      groups.push({
        kind: "prose-run",
        text: "",
        block: node as BlockNode,
        ignores: pendingIgnores,
      });
      pendingIgnores = [];
    } else {
      if (pendingIgnores.length > 0) {
        for (const ignore of pendingIgnores) groups.push({ kind: "other", node: ignore });
        pendingIgnores = [];
      }
      groups.push({ kind: "other", node });
    }
    i++;
  }

  // Flush any remaining prose lines
  if (proseLines.length > 0) {
    flushProse(null);
  }

  // Orphaned directives are retained as standalone nodes for agent view. Human
  // view deliberately does not render them outside an attached card.
  for (const ignore of pendingIgnores) groups.push({ kind: "other", node: ignore });

  return groups;
}

/**
 * The active document — with its changes inline when a visualized difference
 * touches it. A separate component per mode keeps each one's hooks stable.
 */
export function DocumentView(props: DocumentViewProps) {
  const doc = props.documents[props.activeDocIndex];
  const diffDocument = doc ? props.diffDocuments?.get(filename(doc.filePath)) : undefined;
  if (doc && diffDocument) {
    return (
      <ChapterDiff
        diff={diffDocument}
        context={{
          document: doc,
          elementsMap: props.elementsMap,
          elementDocMap: props.elementDocMap,
          edges: props.edges,
        }}
        viewMode={props.viewMode}
        targetElementId={props.targetElementId}
        onTargetConsumed={props.onTargetConsumed}
      />
    );
  }
  return <PlainDocumentView {...props} />;
}

function PlainDocumentView({
  documents,
  viewMode,
  elementsMap,
  elementDocMap,
  edges,
  activeDocIndex,
  targetElementId,
  onTargetConsumed,
}: DocumentViewProps) {
  const doc = documents[activeDocIndex];
  if (!doc) return <div className={styles.empty}>No document selected.</div>;

  const groups = useMemo(() => groupNodes(doc.nodes), [doc]);

  const chapterTitle = useMemo(() => {
    const h1 = doc.nodes.find(
      (n): n is HeadingNode => n.kind === "heading" && (n as HeadingNode).level === 1,
    ) as HeadingNode | undefined;
    if (!h1) return null;
    return h1.text.trim();
  }, [doc]);

  return (
    <article className={styles.documentView}>
      {chapterTitle && (
        <h1 className={[styles.heading, styles.heading1, styles.chapterTitle].join(" ")}>
          {chapterTitle}
        </h1>
      )}
      {groups.map((group, i) => {
        if (group.kind === "other") {
          return (
            <AstNodeRenderer
              key={i}
              node={group.node}
              viewMode={viewMode}
              elementsMap={elementsMap}
              elementDocMap={elementDocMap}
              edges={edges}
            />
          );
        }
        // prose-run (with optional attached arc42 block)
        const blockId = group.block?.attributes["id"] ?? null;
        return (
          <AstNodeRenderer
            key={i}
            node={
              {
                kind: "prose-run",
                text: group.text,
                renderedHtml: group.renderedHtml,
                block: group.block,
                ignores: group.ignores,
              } as AstNode
            }
            viewMode={viewMode}
            elementsMap={elementsMap}
            elementDocMap={elementDocMap}
            edges={edges}
            autoExpandElementId={blockId === targetElementId ? targetElementId : null}
            onAutoExpanded={blockId === targetElementId ? onTargetConsumed : undefined}
          />
        );
      })}
    </article>
  );
}
