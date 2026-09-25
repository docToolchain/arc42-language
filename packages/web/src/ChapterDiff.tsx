import React, { useMemo } from "react";
import type { CoreAstNode, DiffDocument, DocumentAst, Edge, Element, OutlineEntry } from "./types";
import { ChangeCounts, NodesRender, SegmentView, sectionKeyOf } from "./DiffSegment";
import docStyles from "./DocumentView.module.css";
import styles from "./ChangesView.module.css";

/**
 * The full document the chapter is shown against, with the maps its element
 * cards need. Given with `serve/build --diff`, where the page holds the head
 * workspace; absent in the history, where unchanged sections are skeletons.
 */
export interface ChapterContext {
  document: DocumentAst;
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
  edges: Edge[];
}

interface ChapterDiffProps {
  diff: DiffDocument;
  context?: ChapterContext;
  viewMode: "human" | "agent";
  targetElementId?: string | null;
  onTargetConsumed?: () => void;
}

function lineOf(node: CoreAstNode): number {
  return node.kind === "heading" || node.kind === "prose" ? node.line : node.startLine;
}

function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Heading and placeholder of an unchanged section whose content is not loaded. */
function SkeletonSection({ entry }: { entry: OutlineEntry }) {
  const Tag = `h${Math.min(Math.max(entry.level, 2), 6)}` as keyof React.JSX.IntrinsicElements;
  const levelClass =
    [docStyles.heading2, docStyles.heading3, docStyles.heading4][entry.level - 1] ??
    docStyles.heading4;
  return (
    <section data-testid="unchanged-section" aria-label={`unchanged: ${entry.title || "Preamble"}`}>
      {entry.level > 1 && (
        <Tag id={headingAnchor(entry.title)} className={[docStyles.heading, levelClass].join(" ")}>
          {entry.title}
        </Tag>
      )}
      {!entry.empty && (
        <div className={styles.skeleton} data-testid="section-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  );
}

/**
 * A changed chapter: every section in document order, changed sections marked
 * inline (removed ones at their former position), unchanged sections rendered
 * from the full document when available, otherwise as heading and skeleton.
 */
export function ChapterDiff({
  diff,
  context,
  viewMode,
  targetElementId,
  onTargetConsumed,
}: ChapterDiffProps) {
  const segments = useMemo(
    () => new Map(diff.segments.map((segment) => [sectionKeyOf(segment.section), segment])),
    [diff],
  );
  return (
    <article
      className={[docStyles.documentView, styles.chapter].join(" ")}
      data-testid="chapter-diff"
      data-file={diff.file}
      id={`chapter-${diff.file}`}
    >
      <header className={styles.chapterHeader}>
        <h1 className={[docStyles.heading, docStyles.heading1, docStyles.chapterTitle].join(" ")}>
          {diff.title}
        </h1>
        <ChangeCounts {...diff} />
      </header>
      {diff.outline.map((entry) => {
        const key = sectionKeyOf(entry.section);
        const segment = segments.get(key);
        if (segment) {
          return (
            <SegmentView
              key={key}
              segment={segment}
              viewMode={viewMode}
              targetElementId={targetElementId}
              onTargetConsumed={onTargetConsumed}
            />
          );
        }
        if (context && entry.head) {
          const { startLine, endLine } = entry.head;
          const nodes = context.document.nodes.filter((node) => {
            const line = lineOf(node);
            return line >= startLine && line <= endLine;
          });
          return (
            <section key={key} data-testid="unchanged-section">
              <NodesRender
                nodes={nodes}
                viewMode={viewMode}
                elementsMap={context.elementsMap}
                elementDocMap={context.elementDocMap}
                edges={context.edges}
                targetElementId={targetElementId}
                onTargetConsumed={onTargetConsumed}
              />
            </section>
          );
        }
        return <SkeletonSection key={key} entry={entry} />;
      })}
    </article>
  );
}
