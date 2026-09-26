// Delivers the architecture history: plain data from the filesystem workspace
// adapter, in the Web Renderer's history format.
import { toHistoryPearls } from "@arc42/web/history-format";
import type { HistoryEntry, HistoryPearl } from "@arc42/web/history-format";
import { MarkdownProseRenderer } from "@arc42/core/notation/markdown";
import { loadCommitChange } from "@arc42/workspace-fs";
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
