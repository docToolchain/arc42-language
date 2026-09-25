/**
 * Architecture history — the "pearl chain" of commits that touched architecture
 * documents. Served as JSONL by `arc42 serve` (`/api/history/…`) and written by
 * `arc42 build --with-history` (`history/…`) in the same two-level layout:
 *
 * - `index.jsonl`: one HistoryPearl per line, newest first — cheap git metadata
 *   so the whole chain can be drawn at once;
 * - `chunk-<n>.jsonl`: one HistoryEntry per line for the pearls whose `chunk`
 *   is n — the diff and everything else that needs computing.
 */

import type { DiffPayload } from "./diff-view.ts";

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
