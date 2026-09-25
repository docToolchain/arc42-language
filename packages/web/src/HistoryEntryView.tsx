import React, { useEffect } from "react";
import type { HistoryEntry, HistoryPearl } from "./types";
import { ChangesView } from "./ChangesView";
import styles from "./ChangesView.module.css";

interface HistoryEntryViewProps {
  pearl: HistoryPearl | undefined;
  entry: HistoryEntry | undefined;
  chunkError: string | undefined;
  requestChunk: (chunk: number) => void;
  viewMode: "human" | "agent";
}

/** The change of one pearl of the architecture history. */
export function HistoryEntryView({
  pearl,
  entry,
  chunkError,
  requestChunk,
  viewMode,
}: HistoryEntryViewProps) {
  useEffect(() => {
    if (pearl && !entry) requestChunk(pearl.chunk);
  }, [pearl, entry, requestChunk]);

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
    />
  );
}
