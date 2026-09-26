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
 *   is n — the diff and everything else that needs computing;
 * - `tree/<commit>.json`: the SnapshotTree of a commit — its architecture files
 *   and every tracked path — to open that version as a whole;
 * - `blob/<id>`: one architecture file, stored once under its git blob id and
 *   shared by every commit that contains it.
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

/** The files of the workspace at one commit, to open that version as a whole. */
export interface SnapshotTree {
  /** Architecture files: repository-relative path → git blob id (`blob/<id>`). */
  files: Record<string, string>;
  /**
   * Every tracked path at this commit, code included, for coverage — or the
   * commit whose tree lists the same paths, so an unchanged list is stored once.
   * A referenced tree always lists its paths itself.
   */
  paths: string[] | { sameAs: string };
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

/** Name of the file holding a commit's snapshot tree. */
export function snapshotTreeFile(commit: string): string {
  return `tree/${commit}.json`;
}

/** The commit a file name holds the tree of, or undefined when it names no tree file. */
export function snapshotTreeOf(file: string): string | undefined {
  return /^tree\/([0-9a-f]{40})\.json$/.exec(file)?.[1];
}

/** Name of the file holding one architecture file by its git blob id. */
export function snapshotBlobFile(id: string): string {
  return `blob/${id}`;
}

/** The blob id a file name holds, or undefined when it names no blob file. */
export function snapshotBlobOf(file: string): string | undefined {
  return /^blob\/([0-9a-f]{40})$/.exec(file)?.[1];
}

/**
 * Share path lists between trees: a tree whose paths equal those of a tree
 * seen before refers to it instead of repeating them. Trees are given in any
 * order; the first tree with a list keeps it.
 */
export function sharePathLists(
  trees: ReadonlyArray<{ commit: string; files: Record<string, string>; paths: string[] }>,
): Map<string, SnapshotTree> {
  const owners = new Map<string, string>();
  const shared = new Map<string, SnapshotTree>();
  for (const tree of trees) {
    const key = JSON.stringify(tree.paths);
    const owner = owners.get(key);
    if (owner === undefined) owners.set(key, tree.commit);
    shared.set(tree.commit, {
      files: tree.files,
      paths: owner === undefined ? tree.paths : { sameAs: owner },
    });
  }
  return shared;
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
