import React, { useMemo, useState } from "react";
import type {
  AstNode,
  AttributeChange,
  DiffDocument,
  DiffSegment,
  Element,
  Edge,
  SectionContent,
  SectionRef,
} from "./types";
import { groupNodes } from "./DocumentView";
import { AstNodeRenderer } from "./AstNodeRenderer";
import { filename } from "./utils";
import styles from "./ChangesView.module.css";

/** Shorten a commit id to 8 characters; labels such as "working tree" pass through. */
export function snapshotLabel(label: string): string {
  return /^[0-9a-f]{40}$/.test(label) ? label.slice(0, 8) : label;
}

/** Identity of a section across snapshots — the same key the core diff uses. */
export function sectionKeyOf(ref: SectionRef): string {
  return JSON.stringify([ref.file, ref.headingPath, ref.occurrence]);
}

export const STATUS_CLASS: Record<string, string | undefined> = {
  added: styles.added,
  modified: styles.modified,
  removed: styles.removed,
  unchanged: styles.modified,
};

export function ChangeCounts({
  added,
  modified,
  removed,
}: Pick<DiffDocument, "added" | "modified" | "removed">) {
  return (
    <span className={styles.counts}>
      {added > 0 && <span className={styles.countAdded}>+{added}</span>}
      {modified > 0 && <span className={styles.countModified}>~{modified}</span>}
      {removed > 0 && <span className={styles.countRemoved}>−{removed}</span>}
    </span>
  );
}

/** Render AST nodes the way the Documents view does. */
export function NodesRender({
  nodes,
  viewMode,
  elementsMap,
  elementDocMap,
  edges,
  targetElementId,
  onTargetConsumed,
}: {
  nodes: AstNode[];
  viewMode: "human" | "agent";
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
  edges: Edge[];
  targetElementId?: string | null;
  onTargetConsumed?: () => void;
}) {
  const groups = useMemo(() => groupNodes(nodes), [nodes]);
  return (
    <>
      {groups.map((group, index) => {
        if (group.kind === "other") {
          return (
            <AstNodeRenderer
              key={index}
              node={group.node}
              viewMode={viewMode}
              elementsMap={elementsMap}
              elementDocMap={elementDocMap}
              edges={edges}
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
                renderedHtml: group.renderedHtml,
                block: group.block,
                ignores: group.ignores,
              } as AstNode
            }
            viewMode={viewMode}
            elementsMap={elementsMap}
            elementDocMap={elementDocMap}
            edges={edges}
            autoExpandElementId={isTarget ? targetElementId : null}
            onAutoExpanded={isTarget ? onTargetConsumed : undefined}
          />
        );
      })}
    </>
  );
}

/** Render one side of a changed section with the elements it carries. */
function SectionRender({
  content,
  viewMode,
  targetElementId,
  onTargetConsumed,
}: {
  content: SectionContent;
  viewMode: "human" | "agent";
  targetElementId?: string | null;
  onTargetConsumed?: () => void;
}) {
  const elementsMap = useMemo(
    () => new Map<string, Element>(content.elements.map((element) => [element.id, element])),
    [content],
  );
  const elementDocMap = useMemo(
    () =>
      new Map<string, string>(
        content.elements.map((element) => [element.id, filename(element.loc.file)]),
      ),
    [content],
  );
  return (
    <NodesRender
      nodes={content.nodes}
      viewMode={viewMode}
      elementsMap={elementsMap}
      elementDocMap={elementDocMap}
      edges={content.edges}
      targetElementId={targetElementId}
      onTargetConsumed={onTargetConsumed}
    />
  );
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function AttributeTable({ attributes }: { attributes: AttributeChange[] }) {
  if (attributes.length === 0) return null;
  return (
    <div className={styles.attributesWrap}>
      <table className={styles.attributes}>
        <tbody>
          {attributes.map((attribute) => (
            <tr key={attribute.name} data-testid="attribute-change">
              <th scope="row">{attribute.name}</th>
              <td className={styles.before}>{formatValue(attribute.before)}</td>
              <td className={styles.after}>{formatValue(attribute.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeList({ segment }: { segment: DiffSegment }) {
  const items = [
    ...segment.elements.map((change) => ({
      key: `element-${change.id}`,
      label: change.id,
      kind: change.kind as string,
      status: change.status,
      note: change.proseChanged ? "prose changed" : undefined,
      attributes: change.attributes,
    })),
    ...segment.diagrams.map((change) => ({
      key: `diagram-${change.id}`,
      label: change.id,
      kind: "diagram",
      status: change.status,
      note: undefined,
      attributes: change.attributes,
    })),
  ];
  if (items.length === 0 && !segment.prose) return null;
  return (
    <ul className={styles.changeList} role="list">
      {items.map((item) => (
        <li key={item.key} data-testid="element-change" data-status={item.status}>
          <span className={[styles.chip, STATUS_CLASS[item.status]].join(" ")}>
            {item.status === "unchanged" ? "prose" : item.status}
          </span>
          <span className={styles.kind}>{item.kind}</span>
          <code>{item.label}</code>
          {item.note && item.status === "modified" && (
            <span className={styles.note}>{item.note}</span>
          )}
          <AttributeTable attributes={item.attributes} />
        </li>
      ))}
      {segment.prose && (
        <li data-testid="element-change" data-status={segment.prose.status}>
          <span className={[styles.chip, STATUS_CLASS[segment.prose.status]].join(" ")}>
            {segment.prose.status}
          </span>
          <span className={styles.kind}>prose</span>
        </li>
      )}
    </ul>
  );
}

/** Status of a section — worded apart from the element status chips inside it. */
const SECTION_STATUS: Record<DiffSegment["status"], string> = {
  added: "Section added",
  modified: "Section changed",
  removed: "Section removed",
};

/** One changed section, marked by status, with both versions available. */
export function SegmentView({
  segment,
  viewMode,
  targetElementId,
  onTargetConsumed,
}: {
  segment: DiffSegment;
  viewMode: "human" | "agent";
  targetElementId?: string | null;
  onTargetConsumed?: () => void;
}) {
  const [showBase, setShowBase] = useState(false);
  const path = segment.section.headingPath;
  const title = path[path.length - 1] ?? "Preamble";
  return (
    <section
      className={[styles.segment, STATUS_CLASS[segment.status]].join(" ")}
      data-testid="diff-segment"
      data-status={segment.status}
      aria-label={`${segment.status}: ${title}`}
    >
      <header className={styles.segmentHeader} data-testid="segment-status">
        <span className={styles.sectionStatus}>{SECTION_STATUS[segment.status]}</span>
        {segment.heading && (
          <span className={styles.headingRename} data-testid="segment-heading-change">
            heading <del className={styles.before}>{segment.heading.before}</del>
            <span aria-hidden="true"> → </span>
            <span className={styles.visuallyHidden}> renamed to </span>
            <ins className={styles.after}>{segment.heading.after}</ins>
          </span>
        )}
      </header>
      <ChangeList segment={segment} />
      {segment.status === "removed" && segment.base && (
        <div className={styles.removedContent} data-testid="segment-base">
          <SectionRender content={segment.base} viewMode={viewMode} />
        </div>
      )}
      {segment.status !== "removed" && segment.head && (
        <div data-testid="segment-head">
          <SectionRender
            content={segment.head}
            viewMode={viewMode}
            targetElementId={targetElementId}
            onTargetConsumed={onTargetConsumed}
          />
        </div>
      )}
      {segment.status === "modified" && segment.base && (
        <>
          <button
            type="button"
            className={styles.toggleBase}
            aria-expanded={showBase}
            data-testid="toggle-base"
            onClick={() => setShowBase((value) => !value)}
          >
            {showBase ? "Hide previous version" : "Show previous version"}
          </button>
          {showBase && (
            <div className={styles.removedContent} data-testid="segment-base">
              <SectionRender content={segment.base} viewMode={viewMode} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
