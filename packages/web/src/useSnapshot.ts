import { useEffect, useState } from "react";
import { snapshotBlobFile, snapshotTreeFile } from "./history-format";
import type { SnapshotTree } from "./history-format";
import type { WorkspacePayload } from "./types";
import { readHistoryFile } from "./useHistory";
import type { HistorySource } from "./useHistory";

export type SnapshotState =
  | { status: "loading" }
  | { status: "error"; reason: string }
  | { status: "ready"; payload: WorkspacePayload };

// Commits and blobs never change: each is loaded once per history source.
const blobCache = new WeakMap<HistorySource, Map<string, Promise<string>>>();
const snapshotCache = new WeakMap<HistorySource, Map<string, Promise<WorkspacePayload>>>();

function cached<T>(
  cache: WeakMap<HistorySource, Map<string, Promise<T>>>,
  source: HistorySource,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  let entries = cache.get(source);
  if (!entries) cache.set(source, (entries = new Map()));
  let entry = entries.get(key);
  if (!entry) {
    entry = load();
    // A failed load is not kept: the next attempt reads again.
    entry.catch(() => entries.delete(key));
    entries.set(key, entry);
  }
  return entry;
}

async function readTree(source: HistorySource, commit: string): Promise<SnapshotTree> {
  return JSON.parse(await readHistoryFile(source, snapshotTreeFile(commit))) as SnapshotTree;
}

/** Every tracked path of a tree, following a shared list to the tree that holds it. */
async function trackedPaths(source: HistorySource, tree: SnapshotTree): Promise<string[]> {
  if (Array.isArray(tree.paths)) return tree.paths;
  const owner = tree.paths.sameAs;
  const { paths } = await readTree(source, owner);
  if (!Array.isArray(paths)) {
    throw new Error(`The tree of ${owner} refers to another tree instead of listing its paths`);
  }
  return paths;
}

/**
 * Build the workspace of one commit in the browser: its file list, its
 * architecture files, then the Core Library's loader — imported on demand, and
 * with it only the notation the files use.
 */
export function loadSnapshot(source: HistorySource, commit: string): Promise<WorkspacePayload> {
  return cached(snapshotCache, source, commit, async () => {
    const tree = await readTree(source, commit);
    const [paths, files] = await Promise.all([
      trackedPaths(source, tree),
      Promise.all(
        Object.entries(tree.files).map(async ([path, id]) => ({
          path,
          content: await cached(blobCache, source, id, () =>
            readHistoryFile(source, snapshotBlobFile(id)),
          ),
        })),
      ),
    ]);
    const { loadWorkspaceFromFiles } = await import("@arc42/core");
    return loadWorkspaceFromFiles(files, paths, `commit ${commit.slice(0, 8)}`);
  });
}

/**
 * The workspace of `commit` (null: none requested), loaded from the history.
 * `source` is undefined while it is not known yet whether there is a history.
 */
export function useSnapshot(
  source: HistorySource | null | undefined,
  commit: string | null,
): SnapshotState {
  // Tagged with its commit, so a switch never shows the previous version as ready.
  const [state, setState] = useState<{ commit: string | null; state: SnapshotState }>({
    commit: null,
    state: { status: "loading" },
  });
  useEffect(() => {
    if (!commit || source === undefined) return;
    if (source === null) {
      setState({
        commit,
        state: { status: "error", reason: "This site has no architecture history." },
      });
      return;
    }
    let active = true;
    loadSnapshot(source, commit)
      .then((payload) => active && setState({ commit, state: { status: "ready", payload } }))
      .catch(
        (error: unknown) =>
          active &&
          setState({
            commit,
            state: { status: "error", reason: String(error).replace(/^Error: /, "") },
          }),
      );
    return () => {
      active = false;
    };
  }, [source, commit]);
  return state.commit === commit ? state.state : { status: "loading" };
}
