import React, { useMemo, useState } from "react";
import type {
  AstNode,
  AttributeChange,
  DiffDocument,
  DiffFinding,
  DiffPayload,
  DiffSegment,
  Element,
  SectionContent,
} from "./types";
import { groupNodes } from "./DocumentView";
import { AstNodeRenderer } from "./AstNodeRenderer";
import { filename } from "./utils";
import docStyles from "./DocumentView.module.css";
import styles from "./ChangesView.module.css";

interface ChangesViewProps {
  diff: DiffPayload | null;
  /** Set when the difference could not be computed (serve --diff reload failure). */
  error: string | null;
  viewMode: "human" | "agent";
}

/** Shorten a commit id to 8 characters; labels such as "working tree" pass through. */
export function snapshotLabel(label: string): string {
  return /^[0-9a-f]{40}$/.test(label) ? label.slice(0, 8) : label;
}

/** Renders one visualized architecture difference, grouped by document. */
export function ChangesView({ diff, error, viewMode }: ChangesViewProps) {
  return (
    <article className={styles.changes} data-testid="changes-view">
      <h1 className={[docStyles.heading, docStyles.heading1, docStyles.chapterTitle].join(" ")}>
        Changes
      </h1>
      {diff && (
        <p className={styles.range} data-testid="changes-range">
          <code>{snapshotLabel(diff.base.label)}</code>
          <span aria-hidden="true"> → </span>
          <span className={styles.visuallyHidden}> to </span>
          <code>{snapshotLabel(diff.head.label)}</code>
        </p>
      )}
      {error !== null && (
        <div className={styles.error} role="alert" data-testid="diff-error">
          <strong>The difference could not be computed.</strong>
          <pre>{error}</pre>
        </div>
      )}
      {diff && error === null && <Findings findings={diff.findings} />}
      {diff && error === null && diff.view.documents.length === 0 && (
        <p className={styles.empty} data-testid="changes-empty">
          No architecture changes.
        </p>
      )}
      {diff &&
        error === null &&
        diff.view.documents.map((document) => (
          <DocumentChanges key={document.file} document={document} viewMode={viewMode} />
        ))}
    </article>
  );
}

function Findings({ findings }: { findings: DiffFinding[] }) {
  if (findings.length === 0) return null;
  return (
    <section className={styles.findings} aria-label="Findings" data-testid="diff-findings">
      <ul role="list">
        {findings.map((finding, index) => (
          <li
            key={`${finding.kind}-${finding.file}-${finding.line}-${index}`}
            className={finding.severity === "warning" ? styles.warning : undefined}
            data-testid="diff-finding"
          >
            <span className={styles.severity}>{finding.severity}</span>
            <span>{finding.message}</span>
            <code className={styles.location}>
              {filename(finding.file)}
              {finding.line > 0 ? `:${finding.line}` : ""}
            </code>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Counts({
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

export { Counts as ChangeCounts };

function DocumentChanges({
  document,
  viewMode,
}: {
  document: DiffDocument;
  viewMode: "human" | "agent";
}) {
  return (
    <section className={styles.document} data-testid="diff-document" data-file={document.file}>
      <header className={styles.documentHeader}>
        <h2 className={styles.documentTitle} data-testid="diff-document-title">
          <a href={`#${filename(document.file)}`}>{document.title}</a>
        </h2>
        <Counts {...document} />
      </header>
      {document.segments.map((segment) => (
        <Segment
          key={JSON.stringify([segment.section.headingPath, segment.section.occurrence])}
          segment={segment}
          viewMode={viewMode}
        />
      ))}
    </section>
  );
}

const STATUS_CLASS: Record<string, string | undefined> = {
  added: styles.added,
  modified: styles.modified,
  removed: styles.removed,
  unchanged: styles.modified,
};

function Segment({ segment, viewMode }: { segment: DiffSegment; viewMode: "human" | "agent" }) {
  const [showBase, setShowBase] = useState(false);
  const path = segment.section.headingPath;
  return (
    <section
      className={[styles.segment, STATUS_CLASS[segment.status]].join(" ")}
      data-testid="diff-segment"
      data-status={segment.status}
      aria-label={`${segment.status}: ${path[path.length - 1] ?? "Preamble"}`}
    >
      <header className={styles.segmentHeader}>
        <span className={styles.status}>{segment.status}</span>
        <span className={styles.path}>{path.length > 0 ? path.join(" › ") : "Preamble"}</span>
      </header>
      <ChangeList segment={segment} />
      {segment.status === "removed" && segment.base && (
        <div className={styles.removedContent} data-testid="segment-base">
          <SectionRender content={segment.base} viewMode={viewMode} />
        </div>
      )}
      {segment.status !== "removed" && segment.head && (
        <div data-testid="segment-head">
          <SectionRender content={segment.head} viewMode={viewMode} />
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

function SectionRender({
  content,
  viewMode,
}: {
  content: SectionContent;
  viewMode: "human" | "agent";
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
  const groups = useMemo(() => groupNodes(content.nodes), [content]);
  return (
    <>
      {groups.map((group, index) => (
        <AstNodeRenderer
          key={index}
          node={
            group.kind === "other"
              ? group.node
              : ({
                  kind: "prose-run",
                  text: group.text,
                  renderedHtml: group.renderedHtml,
                  block: group.block,
                  ignores: group.ignores,
                } as AstNode)
          }
          viewMode={viewMode}
          elementsMap={elementsMap}
          elementDocMap={elementDocMap}
          edges={content.edges}
        />
      ))}
    </>
  );
}
