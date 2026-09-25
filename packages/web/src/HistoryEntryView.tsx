import React, { useEffect, useMemo, useState } from "react";
import type { HistoryEntry, HistoryPearl } from "./types";
import { ChangesView } from "./ChangesView";
import type { ChangeLink } from "./ChangesView";
import { filename } from "./utils";
import styles from "./ChangesView.module.css";

interface HistoryEntryViewProps {
  pearl: HistoryPearl | undefined;
  entry: HistoryEntry | undefined;
  chunkError: string | undefined;
  requestChunk: (chunk: number) => void;
  viewMode: "human" | "agent";
  /** Element id → file name in the current documentation, for elements this entry does not show. */
  elementDocMap: Map<string, string>;
}

/** The change of one pearl of the architecture history. */
export function HistoryEntryView({
  pearl,
  entry,
  chunkError,
  requestChunk,
  viewMode,
  elementDocMap,
}: HistoryEntryViewProps) {
  useEffect(() => {
    if (pearl && !entry) requestChunk(pearl.chunk);
  }, [pearl, entry, requestChunk]);

  // Links in the summary scroll to the chapters below; elements the entry does
  // not show lead to the current documentation.
  const [targetElementId, setTargetElementId] = useState<string | null>(null);
  const shownElements = useMemo(() => {
    const ids = new Set<string>();
    for (const document of entry?.diff?.view.documents ?? []) {
      for (const segment of document.segments) {
        for (const change of segment.elements) if (change.head) ids.add(change.id);
      }
    }
    return ids;
  }, [entry]);
  const elementLink = (elementId: string): ChangeLink | null => {
    if (shownElements.has(elementId)) {
      return {
        href: `#el-${elementId}`,
        onClick: (event) => {
          event.preventDefault();
          setTargetElementId(elementId);
        },
      };
    }
    const file = elementDocMap.get(elementId);
    return file ? { href: `#${file}:el-${elementId}` } : null;
  };
  const documentLink = (file: string): ChangeLink => ({
    href: `#chapter-${filename(file)}`,
    onClick: (event) => {
      event.preventDefault();
      document.getElementById(`chapter-${file}`)?.scrollIntoView({ behavior: "smooth" });
    },
  });

  if (!pearl) {
    return (
      <p className={styles.empty} data-testid="history-no-selection">
        Select a commit in the history.
      </p>
    );
  }
  const meta = (
    <p className={styles.range} data-testid="history-entry-meta">
      <code>{pearl.commit ? pearl.commit.slice(0, 8) : "working tree"}</code>
      {pearl.author && ` · ${pearl.author}`} · {pearl.date.slice(0, 10)}
    </p>
  );
  if (!entry) {
    return (
      <ChangesView
        diff={null}
        error={chunkError ?? null}
        viewMode={viewMode}
        title={pearl.subject}
        elementLink={elementLink}
        documentLink={documentLink}
        meta={
          <>
            {meta}
            {!chunkError && (
              <p className={styles.empty} role="status" data-testid="history-entry-loading">
                Computing the change…
              </p>
            )}
          </>
        }
      />
    );
  }
  return (
    <ChangesView
      diff={entry.diff ?? null}
      error={entry.error ?? null}
      viewMode={viewMode}
      title={pearl.subject}
      meta={meta}
      elementLink={elementLink}
      documentLink={documentLink}
      withChapters
      targetElementId={targetElementId}
      onTargetConsumed={() => setTargetElementId(null)}
    />
  );
}
