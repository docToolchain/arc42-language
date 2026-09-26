import { useCallback, useEffect, useRef, useState } from "react";
import { HISTORY_INDEX_FILE, historyChunkFile, parseJsonLines } from "./history-format";
import type { HistoryEntry, HistoryPearl } from "./history-format";

/**
 * Where the architecture history lives: `arc42 serve` answers under
 * /api/history/, `arc42 build --with-history` writes history/ next to the page,
 * and `--single-file` puts the same files into the page itself. All provide the
 * files of history-format.ts.
 */
export type HistorySource = { base: string } | { files: Record<string, string> };

export type HistoryState =
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; pearls: HistoryPearl[] };

/** Key of a pearl in routes and maps: its commit id, or "worktree". */
export function pearlKey(pearl: { commit: string | null }): string {
  return pearl.commit ?? "worktree";
}

/** Read one history file as text, from the server or the site, or from the page itself. */
export async function readHistoryFile(source: HistorySource, name: string): Promise<string> {
  if ("files" in source) {
    const text = source.files[name];
    if (text === undefined) throw new Error(`The page contains no history file ${name}`);
    return text;
  }
  const url = `${source.base}${name}`;
  const response = await fetch(url);
  if (!response.ok) {
    let reason = `${url} returned ${response.status}`;
    try {
      reason = ((await response.json()) as { error?: string }).error ?? reason;
    } catch {
      // Not a JSON error body — keep the status line.
    }
    throw new Error(reason);
  }
  return response.text();
}

async function readJsonLines<T>(source: HistorySource, name: string): Promise<T[]> {
  return parseJsonLines<T>(await readHistoryFile(source, name));
}

/**
 * Load the pearl index eagerly and entries chunk by chunk on request.
 * `version` changes when the server announces new data: the index is reloaded
 * and every loaded chunk is dropped.
 */
export function useHistory(source: HistorySource | null, version: number) {
  const [state, setState] = useState<HistoryState>({ status: "loading" });
  const [entries, setEntries] = useState<Map<string, HistoryEntry>>(new Map());
  const [chunkErrors, setChunkErrors] = useState<Map<number, string>>(new Map());
  const requested = useRef(new Set<number>());

  useEffect(() => {
    if (!source) return;
    let active = true;
    requested.current = new Set();
    setEntries(new Map());
    setChunkErrors(new Map());
    readJsonLines<HistoryPearl>(source, HISTORY_INDEX_FILE)
      .then((pearls) => active && setState({ status: "ready", pearls }))
      .catch((error: unknown) => {
        if (active)
          setState({ status: "unavailable", reason: String(error).replace(/^Error: /, "") });
      });
    return () => {
      active = false;
    };
  }, [source, version]);

  const requestChunk = useCallback(
    (chunk: number) => {
      if (!source || requested.current.has(chunk)) return;
      requested.current.add(chunk);
      readJsonLines<HistoryEntry>(source, historyChunkFile(chunk))
        .then((loaded) =>
          setEntries((previous) => {
            const next = new Map(previous);
            for (const entry of loaded) next.set(pearlKey(entry), entry);
            return next;
          }),
        )
        .catch((error: unknown) =>
          setChunkErrors((previous) => new Map(previous).set(chunk, String(error))),
        );
    },
    [source, version], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { state, entries, chunkErrors, requestChunk };
}
