/**
 * The architecture history as the Web Renderer reads it — the "pearl chain" of
 * commits that touched architecture documents. The Web Renderer owns this
 * format because it is its only reader; the CLI writes it (`arc42 build
 * --with-history`, into `history/`) and serves it (`arc42 serve`, under
 * `/api/history/`) in the same two-level layout:
 *
 * - `index.jsonl`: one HistoryPearl per line, newest first — cheap git metadata
 *   so the whole chain can be drawn at once;
 * - `chunk-<n>.jsonl`: one HistoryEntry per line for the pearls whose `chunk`
 *   is n — the diff and everything else that needs computing.
 *
 * Plain TypeScript: no React and no browser APIs, so the CLI can bundle it.
 */

import type { DiffPayload } from "@arc42/core/types";

export interface HistoryPearl {
  /** Commit id; null for uncommitted changes in the working tree. */
  commit: string | null;
  /** First parent; null for a root commit. For the working tree: HEAD. */
  parent: string | null;
  author: string;
  /** ISO 8601 author date; for the working tree, when it was read. */
  date: string;
  subject: string;
  /** Number of the chunk file holding this pearl's entry. */
  chunk: number;
}

export interface HistoryEntry {
  /** Commit id of the pearl this entry belongs to; null for the working tree. */
  commit: string | null;
  /** Rendered commit message body (Markdown); empty when there is none. */
  messageHtml: string;
  /** True when the semantic diff is not empty; false for reformatting-only commits. */
  semantic: boolean;
  added: number;
  modified: number;
  removed: number;
  diff?: DiffPayload;
  /** Set instead of `diff` when a snapshot of this commit cannot be diffed. */
  error?: string;
}

/** Pearls per chunk file. */
export const HISTORY_CHUNK_SIZE = 20;

/** Name of the file listing all pearls. */
export const HISTORY_INDEX_FILE = "index.jsonl";

/** Name of the file holding the entries of one chunk. */
export function historyChunkFile(chunk: number): string {
  return `chunk-${chunk}.jsonl`;
}

/** The chunk a file name holds, or undefined when it names no chunk file. */
export function historyChunkOf(file: string): number | undefined {
  const match = /^chunk-(\d+)\.jsonl$/.exec(file);
  return match ? Number(match[1]) : undefined;
}

/** Number the pearls of a newest-first commit list into chunks, in order. */
export function toHistoryPearls(
  commits: ReadonlyArray<Omit<HistoryPearl, "chunk">>,
): HistoryPearl[] {
  return commits.map((commit, index) => ({
    commit: commit.commit,
    parent: commit.parent,
    author: commit.author,
    date: commit.date,
    subject: commit.subject,
    chunk: Math.floor(index / HISTORY_CHUNK_SIZE),
  }));
}

/** Serialize values as JSON Lines. */
export function toJsonLines(values: readonly unknown[]): string {
  return values.map((value) => `${JSON.stringify(value)}\n`).join("");
}

/** Parse JSON Lines; blank lines are skipped. */
export function parseJsonLines<T>(text: string): T[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as T);
}
