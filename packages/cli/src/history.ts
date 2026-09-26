// Delivers the architecture history: plain data from the filesystem workspace
// adapter, in the Web Renderer's history format.
import {
  sharePathLists,
  snapshotBlobFile,
  snapshotTreeFile,
  toHistoryPearls,
} from "@arc42/web/history-format";
import type { HistoryEntry, HistoryPearl, SnapshotTree } from "@arc42/web/history-format";
import { MarkdownProseRenderer } from "@arc42/core/notation/markdown";
import { loadCommitChange, readArchitectureBlob, readCommitFiles } from "@arc42/workspace-fs";
import type { ArchitectureCommit, ArchitectureHistory } from "@arc42/workspace-fs";

/** Commit messages are Markdown, whatever the workspace's notation. */
const messageRenderer = new MarkdownProseRenderer();

/** The pearls of a history, numbered into chunks. */
export function historyPearls(history: ArchitectureHistory): HistoryPearl[] {
  return toHistoryPearls(history.commits);
}

/** The entry of one pearl: its change and its rendered commit message. */
export async function loadHistoryEntry(
  dir: string,
  commit: ArchitectureCommit,
): Promise<HistoryEntry> {
  const messageHtml = commit.body ? messageRenderer.renderProse(commit.body) : "";
  return { ...(await loadCommitChange(dir, commit)), messageHtml };
}

/** The commits of one chunk, in pearl order. */
export function chunkCommits(
  history: ArchitectureHistory,
  pearls: readonly HistoryPearl[],
  chunk: number,
): ArchitectureCommit[] {
  return history.commits.filter((_, index) => pearls[index]!.chunk === chunk);
}

/** The ids of the history's commits; the uncommitted changes have none. */
export function historyCommitIds(history: ArchitectureHistory): string[] {
  return history.commits.flatMap((commit) => (commit.commit ? [commit.commit] : []));
}

/** The snapshot tree of one commit, listing its paths itself. */
export function snapshotTree(dir: string, commit: string): SnapshotTree {
  const { files, paths } = readCommitFiles(dir, commit);
  return { files, paths };
}

/**
 * Every snapshot file of a history, by file name: a tree per commit, sharing
 * unchanged path lists, and each architecture file once under its blob id.
 */
export function snapshotFiles(dir: string, history: ArchitectureHistory): Record<string, string> {
  const commits = historyCommitIds(history);
  const trees = commits.map((commit) => ({ commit, ...readCommitFiles(dir, commit) }));
  const files: Record<string, string> = {};
  for (const [commit, tree] of sharePathLists(trees)) {
    files[snapshotTreeFile(commit)] = JSON.stringify(tree);
  }
  for (const id of new Set(trees.flatMap((tree) => Object.values(tree.files)))) {
    files[snapshotBlobFile(id)] = readArchitectureBlob(dir, commits, id);
  }
  return files;
}
