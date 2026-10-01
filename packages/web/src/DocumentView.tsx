import React, { useMemo } from "react";
import { groupNodes as groupDocumentNodes } from "@cli42/lib/web";
import type { ElementLinks, RenderGroup } from "@cli42/lib/web";
import { ChapterDiff, headingClass } from "@cli42/lib/web-react";
import type { RenderNodesProps } from "@cli42/lib/web-react";
import styles from "./DocumentView.module.css";
import type {
  AstNode,
  CoreAstNode,
  IgnoreNode,
  BlockNode,
  HeadingNode,
  Element,
  Edge,
  DocumentAst,
  DiffDocument,
} from "./types";
import { AstNodeRenderer } from "./AstNodeRenderer";

/** Whether a node is an arc42 block, introduced by the prose before it. */
export function isArc42Block(node: { kind: string }): node is BlockNode {
  return node.kind === "block" && (node as BlockNode).inArc42Fence;
}

/**
 * Prose runs and other nodes of a document (see `groupNodes` of @cli42/lib/web):
 * consecutive prose renders as one (tables), and the arc42 block that follows
 * a paragraph is attached to it (the prose stripe opens its card).
 */
export function groupNodes(
  nodes: readonly CoreAstNode[],
): RenderGroup<CoreAstNode, BlockNode, IgnoreNode>[] {
  return groupDocumentNodes<CoreAstNode, BlockNode, IgnoreNode>(nodes, { isBlock: isArc42Block });
}

/** The workspace the Documents view renders nodes of. */
export interface NodesWorkspace {
  elementsMap: Map<string, Element>;
  links: ElementLinks;
  edges: Edge[];
}

/**
 * Render document nodes the way the Documents view does. The shared views of
 * @cli42/lib/web-react call this for unchanged and changed sections; a diff
 * side (`content`) brings its own elements and edges.
 */
export function NodesRender({
  nodes,
  proseHtml,
  content,
  viewMode,
  targetElementId,
  onTargetConsumed,
  workspace,
}: RenderNodesProps & { workspace: NodesWorkspace }) {
  const own = useMemo<NodesWorkspace>(() => {
    if (!content) return workspace;
    const elements = content.elements as Element[];
    return {
      elementsMap: new Map(elements.map((element) => [element.id, element])),
      // Elements of the current workspace link to it; others stay where they are.
      links: workspace.links,
      edges: content.edges as Edge[],
    };
  }, [content, workspace]);
  const groups = useMemo(() => groupNodes(nodes as CoreAstNode[]), [nodes]);
  let run = 0;
  return (
    <>
      {groups.map((group, index) => {
        if (group.kind === "other") {
          return (
            <AstNodeRenderer
              key={index}
              node={group.node}
              viewMode={viewMode}
              elementsMap={own.elementsMap}
              links={own.links}
              edges={own.edges}
            />
          );
        }
        const blockId = group.block?.attributes["id"] ?? null;
        const isTarget = blockId !== null && blockId === targetElementId;
        return (
          <AstNodeRenderer
            key={index}
            node={
              {
                kind: "prose-run",
                text: group.text,
                renderedHtml: proseHtml?.[run++] ?? group.renderedHtml,
                block: group.block,
                ignores: group.ignores,
              } as AstNode
            }
            viewMode={viewMode}
            elementsMap={own.elementsMap}
            links={own.links}
            edges={own.edges}
            autoExpandElementId={isTarget ? targetElementId : null}
            onAutoExpanded={isTarget ? onTargetConsumed : undefined}
          />
        );
      })}
    </>
  );
}

interface DocumentViewProps extends NodesWorkspace {
  document: DocumentAst | undefined;
  viewMode: "human" | "agent";
  targetElementId: string | null;
  onTargetConsumed: () => void;
  /** The changes of a visualized difference to this document: shown inline. */
  diffDocument?: DiffDocument;
}

/**
 * The active document — with its changes inline when a visualized difference
 * touches it.
 */
export function DocumentView(props: DocumentViewProps) {
  const { document: doc, diffDocument } = props;
  if (!doc) return <div className={styles.empty}>No document selected.</div>;
  if (diffDocument) {
    return (
      <ChapterDiff
        diff={diffDocument}
        document={doc}
        viewMode={props.viewMode}
        targetElementId={props.targetElementId}
        onTargetConsumed={props.onTargetConsumed}
      />
    );
  }
  return <PlainDocumentView {...props} document={doc} />;
}

function PlainDocumentView({
  document: doc,
  viewMode,
  elementsMap,
  links,
  edges,
  targetElementId,
  onTargetConsumed,
}: DocumentViewProps & { document: DocumentAst }) {
  const workspace = useMemo(() => ({ elementsMap, links, edges }), [elementsMap, links, edges]);
  const chapterTitle = useMemo(() => {
    const h1 = doc.nodes.find(
      (n): n is HeadingNode => n.kind === "heading" && (n as HeadingNode).level === 1,
    );
    return h1 ? h1.text.trim() : null;
  }, [doc]);

  return (
    <article className={styles.documentView}>
      {chapterTitle && (
        <h1 className={[headingClass(1), styles.chapterTitle].join(" ")}>{chapterTitle}</h1>
      )}
      <NodesRender
        nodes={doc.nodes}
        viewMode={viewMode}
        targetElementId={targetElementId}
        onTargetConsumed={onTargetConsumed}
        workspace={workspace}
      />
    </article>
  );
}
