import React from "react";
import type { DiffPayload, DiffSegment, ElementCodeChange } from "./types";
import { ChangeCounts, STATUS_CLASS, snapshotLabel } from "./DiffSegment";
import { ChapterDiff } from "./ChapterDiff";
import { filename } from "./utils";
import docStyles from "./DocumentView.module.css";
import styles from "./ChangesView.module.css";

export { ChangeCounts, snapshotLabel } from "./DiffSegment";

/** Where a link in the summary leads: the Documents view (--diff) or the chapters below (history). */
export interface ChangeLink {
  href: string;
  onClick?: (event: React.MouseEvent) => void;
}

interface ChangesViewProps {
  diff: DiffPayload | null;
  /** Set when the difference could not be computed (serve --diff reload failure). */
  error: string | null;
  viewMode: "human" | "agent";
  /** Heading of the view (default "Changes"). */
  title?: string;
  /** Shown below the heading, e.g. commit metadata. */
  meta?: React.ReactNode;
  /** Link to an architecture element, if it can be shown. */
  elementLink: (elementId: string) => ChangeLink | null;
  /** Link to the changes of a document. */
  documentLink: (file: string) => ChangeLink;
  /**
   * Render the changed chapters below the summary (history: without the full
   * documents, unchanged sections are skeletons).
   */
  withChapters?: boolean;
  targetElementId?: string | null;
  onTargetConsumed?: () => void;
}

function Link({
  link,
  children,
  testId,
}: {
  link: ChangeLink | null;
  children: React.ReactNode;
  testId?: string;
}) {
  if (!link) return <>{children}</>;
  return (
    <a href={link.href} onClick={link.onClick} data-testid={testId}>
      {children}
    </a>
  );
}

/**
 * Review summary of one architecture difference: what needs attention first,
 * then a compact index of what changed — each item linking to the change.
 */
export function ChangesView({
  diff,
  error,
  viewMode,
  title = "Changes",
  meta,
  elementLink,
  documentLink,
  withChapters = false,
  targetElementId,
  onTargetConsumed,
}: ChangesViewProps) {
  return (
    <article className={styles.changes} data-testid="changes-view">
      <h1 className={[docStyles.heading, docStyles.heading1, docStyles.chapterTitle].join(" ")}>
        {title}
      </h1>
      {meta}
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
      {diff && error === null && diff.view.documents.length === 0 && (
        <p className={styles.empty} data-testid="changes-empty">
          No architecture changes.
        </p>
      )}
      {diff && error === null && (
        <>
          <Attention diff={diff} elementLink={elementLink} />
          <ChangeIndex diff={diff} elementLink={elementLink} documentLink={documentLink} />
          {withChapters &&
            diff.view.documents.map((document) => (
              <ChapterDiff
                key={document.file}
                diff={document}
                viewMode={viewMode}
                targetElementId={targetElementId}
                onTargetConsumed={onTargetConsumed}
              />
            ))}
        </>
      )}
    </article>
  );
}

function CodeChanges({
  changes,
  elementLink,
}: {
  changes: ElementCodeChange[];
  elementLink: (elementId: string) => ChangeLink | null;
}) {
  return (
    <ul role="list">
      {changes.map((change) => (
        <li key={change.elementId} data-testid="code-change" data-element={change.elementId}>
          <Link link={elementLink(change.elementId)}>
            <code>{change.elementId}</code>
          </Link>
          <span className={styles.files}>
            {change.files.map((file) => (
              <code key={file}>{file}</code>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Findings, grouped by what needs attention. */
function Attention({
  diff,
  elementLink,
}: {
  diff: DiffPayload;
  elementLink: (elementId: string) => ChangeLink | null;
}) {
  const { warnings, untouched, updated, uncovered } = diff.groups;
  return (
    <>
      {warnings.length > 0 && (
        <section className={styles.findings} aria-label="Warnings" data-testid="diff-warnings">
          <h2 className={styles.groupTitle}>Warnings</h2>
          <ul role="list">
            {warnings.map((finding, index) => (
              <li
                key={`${finding.kind}-${finding.file}-${finding.line}-${index}`}
                className={styles.warning}
                data-testid="diff-finding"
              >
                <Link link={finding.elementId ? elementLink(finding.elementId) : null}>
                  {finding.message}
                </Link>
                <code className={styles.location}>
                  {filename(finding.file)}
                  {finding.line > 0 ? `:${finding.line}` : ""}
                </code>
              </li>
            ))}
          </ul>
        </section>
      )}
      {untouched.length > 0 && (
        <section
          className={styles.findings}
          aria-label="Code changed, architecture untouched"
          data-testid="diff-untouched"
        >
          <h2 className={styles.groupTitle}>Code changed, architecture untouched</h2>
          <p className={styles.groupHint}>Do these elements still describe the code?</p>
          <CodeChanges changes={untouched} elementLink={elementLink} />
        </section>
      )}
      {uncovered.length > 0 && (
        <section
          className={styles.findings}
          aria-label="Not covered by any building block"
          data-testid="diff-uncovered"
        >
          <h2 className={styles.groupTitle}>Not covered by any building block</h2>
          <ul role="list">
            {uncovered.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
      {updated.length > 0 && (
        <details className={styles.findings} data-testid="diff-updated">
          <summary className={styles.groupTitle}>
            Code changed, element also updated in this change ({updated.length})
          </summary>
          <CodeChanges changes={updated} elementLink={elementLink} />
        </details>
      )}
    </>
  );
}

function segmentItems(segment: DiffSegment) {
  const items = [
    ...segment.elements.map((change) => ({
      key: change.id,
      label: change.id,
      elementId: change.id as string | null,
      status: change.status === "unchanged" ? "modified" : change.status,
    })),
    ...segment.diagrams.map((change) => ({
      key: `diagram-${change.id}`,
      label: change.id,
      elementId: null,
      status: change.status,
    })),
  ];
  if (segment.prose) {
    items.push({
      key: `section-${segment.section.headingPath.join("/")}`,
      label: `§ ${segment.section.headingPath[segment.section.headingPath.length - 1] ?? "Preamble"}`,
      elementId: null,
      status: segment.prose.status,
    });
  }
  return items;
}

/** Compact index of what changed, per chapter. */
function ChangeIndex({
  diff,
  elementLink,
  documentLink,
}: {
  diff: DiffPayload;
  elementLink: (elementId: string) => ChangeLink | null;
  documentLink: (file: string) => ChangeLink;
}) {
  if (diff.view.documents.length === 0) return null;
  return (
    <section className={styles.index} aria-label="Changed chapters" data-testid="diff-index">
      <h2 className={styles.groupTitle}>Changed chapters</h2>
      <ul role="list">
        {diff.view.documents.map((document) => (
          <li key={document.file} data-testid="diff-index-document" data-file={document.file}>
            <span className={styles.indexTitle}>
              <Link link={documentLink(document.file)} testId="diff-index-document-link">
                {document.title}
              </Link>
              <ChangeCounts {...document} />
            </span>
            <span className={styles.indexItems}>
              {document.segments.flatMap(segmentItems).map((item) => (
                <span
                  key={item.key}
                  className={[styles.chip, STATUS_CLASS[item.status]].join(" ")}
                  data-testid="diff-index-item"
                  data-status={item.status}
                >
                  <Link link={item.elementId ? elementLink(item.elementId) : null}>
                    {item.label}
                  </Link>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
