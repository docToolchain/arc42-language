import { isArchitectureFile, loadWorkspaceFromFiles } from "@arc42/core";
import type { WorkspacePayload } from "@arc42/core";
import {
  changedFiles,
  resolveComparison,
  untrackedDocuments,
  workspaceLocation,
} from "@cli42/lib/git";
import type { DiffSpec, SnapshotSource } from "@cli42/lib/git";

export { EMPTY_TREE } from "@cli42/lib/git";
export type { DiffSpec } from "@cli42/lib/git";

export interface Snapshot {
  /** "working tree", "index", or the resolved commit id. */
  label: string;
  /** Full workspace model; document paths are repository-relative. */
  payload: WorkspacePayload;
  /** Repository-relative paths tracked in this snapshot. */
  knownPaths: Set<string>;
}

export interface DiffSnapshots {
  /** Repository root. */
  root: string;
  base: Snapshot;
  head: Snapshot;
  /** Commit the comparison is anchored to; HEAD when the base is the index. */
  baseCommit: string;
  /**
   * Commit an `ARC42_CONSISTENT` acceptance token must match. Undefined when the
   * base is an index that differs from HEAD, because no commit describes it.
   */
  acceptanceBase?: string;
  /** Repository-relative paths of all changed files (code and documents). */
  changedFiles: string[];
  /**
   * Architecture documents of the workspace that Git does not track yet. They
   * exist in the working tree but are not part of the comparison until added.
   * Empty unless the head is the working tree.
   */
  untracked: string[];
}

async function loadSnapshot(
  source: SnapshotSource,
  inWorkspace: (path: string) => boolean,
): Promise<Snapshot> {
  const paths = source.paths();
  const files = paths.filter((path) => isArchitectureFile(path) && inWorkspace(path));
  const payload = await loadWorkspaceFromFiles(
    files.map((path) => ({ path, content: source.read(path) })),
    paths,
    source.label,
  );
  return { label: source.label, knownPaths: new Set(paths), payload };
}

/**
 * Load the base and head snapshots of the workspace in `dir` as full workspace
 * payloads, plus the changed line ranges between them. Both snapshots are
 * parsed with the workspace's notation, so AsciiDoc workspaces are supported
 * on both sides. Git failures (no repository, unknown reference, unreadable
 * blob) are raised, never skipped.
 */
export async function loadDiffSnapshots(dir: string, spec: DiffSpec = {}): Promise<DiffSnapshots> {
  const { root, inWorkspace } = workspaceLocation(dir);
  const comparison = resolveComparison(root, spec);
  const changed = changedFiles(root, comparison);
  const untracked = untrackedDocuments(
    root,
    comparison,
    (path) => isArchitectureFile(path) && inWorkspace(path),
  );
  return {
    root,
    base: await loadSnapshot(comparison.base, inWorkspace),
    head: await loadSnapshot(comparison.head, inWorkspace),
    baseCommit: comparison.baseCommit,
    acceptanceBase: comparison.acceptanceBase,
    changedFiles: changed,
    untracked,
  };
}
