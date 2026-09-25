import React, { useEffect, useRef } from "react";
import type { HistoryEntry, HistoryPearl } from "./types";
import type { HistoryState } from "./useHistory";
import { pearlKey } from "./useHistory";
import { ChangeCounts } from "./ChangesView";
import styles from "./HistoryChain.module.css";

interface HistoryChainProps {
  state: HistoryState;
  entries: Map<string, HistoryEntry>;
  chunkErrors: Map<number, string>;
  requestChunk: (chunk: number) => void;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

type PearlState = "pending" | "semantic" | "empty" | "error";

export function pearlState(entry: HistoryEntry | undefined, chunkError?: string): PearlState {
  if (entry) return entry.error ? "error" : entry.semantic ? "semantic" : "empty";
  return chunkError ? "error" : "pending";
}

/** The architecture history as a chain of pearls, newest first. */
export function HistoryChain({
  state,
  entries,
  chunkErrors,
  requestChunk,
  selectedKey,
  onSelect,
}: HistoryChainProps) {
  if (state.status === "loading") {
    return (
      <p className={styles.note} role="status">
        Loading history…
      </p>
    );
  }
  if (state.status === "unavailable") {
    return (
      <div className={styles.note} data-testid="history-unavailable">
        <strong>No history available.</strong>
        <p>{state.reason}</p>
      </div>
    );
  }
  if (state.pearls.length === 0) {
    return (
      <p className={styles.note} data-testid="history-empty">
        No commit has touched the architecture documents yet.
      </p>
    );
  }
  return (
    <ol className={styles.chain} data-testid="history-chain" aria-label="Architecture history">
      {state.pearls.map((pearl) => (
        <Pearl
          key={pearlKey(pearl)}
          pearl={pearl}
          entry={entries.get(pearlKey(pearl))}
          chunkError={chunkErrors.get(pearl.chunk)}
          selected={selectedKey === pearlKey(pearl)}
          onSelect={onSelect}
          requestChunk={requestChunk}
        />
      ))}
    </ol>
  );
}

function Pearl({
  pearl,
  entry,
  chunkError,
  selected,
  onSelect,
  requestChunk,
}: {
  pearl: HistoryPearl;
  entry: HistoryEntry | undefined;
  chunkError: string | undefined;
  selected: boolean;
  onSelect: (key: string) => void;
  requestChunk: (chunk: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const state = pearlState(entry, chunkError);

  // Load the pearl's chunk once it scrolls into view (or is selected).
  useEffect(() => {
    if (entry) return;
    if (selected) {
      requestChunk(pearl.chunk);
      return;
    }
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver((observed) => {
      if (observed.some((item) => item.isIntersecting)) requestChunk(pearl.chunk);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [entry, selected, pearl.chunk, requestChunk]);

  return (
    <li
      ref={ref}
      className={styles.pearl}
      data-testid="history-pearl"
      data-state={state}
      data-commit={pearlKey(pearl)}
    >
      <button
        type="button"
        className={[styles.pearlButton, selected ? styles.selected : ""].filter(Boolean).join(" ")}
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(pearlKey(pearl))}
      >
        <span className={[styles.bead, styles[state]].join(" ")} aria-hidden="true" />
        <span className={styles.label}>
          <span className={styles.subject}>{pearl.subject}</span>
          <span className={styles.meta}>
            {pearl.commit ? pearl.commit.slice(0, 8) : "working tree"} · {pearl.date.slice(0, 10)}
            {entry && entry.semantic && <ChangeCounts {...entry} />}
            {state === "empty" && <span className={styles.tag}>no model change</span>}
            {state === "error" && <span className={styles.errorTag}>error</span>}
          </span>
        </span>
      </button>
      {selected && entry?.messageHtml && (
        <div
          className={styles.message}
          data-testid="pearl-message"
          // Rendered on the server from the commit message (repository content).
          dangerouslySetInnerHTML={{ __html: entry.messageHtml }}
        />
      )}
    </li>
  );
}
