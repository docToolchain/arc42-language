import { changeCounts, isSemanticChange } from "@cli42/lib/diff";
import { commitDiffSpec, errorMessage, listDocumentHistory } from "@cli42/lib/git";
import type { DocumentCommit, DocumentHistory } from "@cli42/lib/git";
import type { DiffPayload } from "@arc42/core";

import { loadDiffPayload } from "./diff-payload.ts";

/** A commit that touched architecture documents, or the uncommitted changes. */
export type ArchitectureCommit = DocumentCommit;

export type ArchitectureHistory = DocumentHistory;

/** The architecture change of one commit against its first parent. */
export interface CommitChange {
  /** Commit id; null for the working tree. */
  commit: string | null;
  /** True when the semantic diff is not empty; false for reformatting-only commits. */
  semantic: boolean;
  added: number;
  modified: number;
  removed: number;
  diff?: DiffPayload;
  /** Set instead of `diff` when a snapshot of this commit cannot be diffed. */
  error?: string;
}

/**
 * List the first-parent commits that touched architecture documents of the
 * workspace in `dir`, newest first, led by the uncommitted changes when there
 * are any. Throws outside a Git repository.
 */
export function listArchitectureHistory(dir: string): ArchitectureHistory {
  return listDocumentHistory(dir, [".arc42.md", ".arc42.adoc"]);
}

/**
 * Compute the architecture change of one commit. A snapshot that cannot be
 * diffed (e.g. an old commit with duplicate ids) yields a change with `error`
 * instead of `diff`, so one broken commit does not hide the rest of the history.
 */
export async function loadCommitChange(
  dir: string,
  commit: Pick<ArchitectureCommit, "commit">,
): Promise<CommitChange> {
  try {
    const { payload, result } = await loadDiffPayload(dir, commitDiffSpec(commit));
    const architecture = result.architecture;
    return {
      commit: commit.commit,
      semantic: isSemanticChange(architecture),
      ...changeCounts(architecture),
      diff: payload,
    };
  } catch (error) {
    return {
      commit: commit.commit,
      semantic: false,
      added: 0,
      modified: 0,
      removed: 0,
      error: errorMessage(error),
    };
  }
}
