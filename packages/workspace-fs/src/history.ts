import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { HistoryEntry, HistoryPearl } from "@arc42/core";

import { loadDiffPayload } from "./diff-payload.ts";
import type { DiffSpec } from "./diff-snapshots.ts";
import { git } from "./git-diff.ts";
import { MarkdownProseRenderer } from "./notation/markdown-prose-renderer.ts";

/** Pearls per chunk file. */
export const HISTORY_CHUNK_SIZE = 20;

export interface ArchitectureHistory {
  /** Repository root. */
  root: string;
  /** Newest first; a working-tree pearl leads when there are uncommitted changes. */
  pearls: HistoryPearl[];
  /** Raw commit message bodies by commit id. */
  bodies: Map<string, string>;
}

const FIELD = "\u001f";
const RECORD = "\u001e";

/** Pathspecs selecting the architecture documents of the workspace. */
function architecturePathspecs(root: string, dir: string): string[] {
  const workspace = relative(root, realpathSync(resolve(dir))).replaceAll("\\", "/");
  const prefix = workspace === "" ? "" : `${workspace}/`;
  return [`:(glob)${prefix}**/*.arc42.md`, `:(glob)${prefix}**/*.arc42.adoc`];
}

function hasUncommittedChanges(root: string, pathspecs: string[]): boolean {
  try {
    execFileSync("git", ["-C", root, "diff", "HEAD", "--quiet", "--", ...pathspecs]);
    return false;
  } catch (error) {
    // `git diff --quiet` exits 1 for differences; anything else is a failure.
    if ((error as { status?: number }).status === 1) return true;
    throw error;
  }
}

/**
 * List the first-parent commits that touched architecture documents of the
 * workspace in `dir`, newest first, plus a working-tree pearl when there are
 * uncommitted changes. Throws outside a Git repository.
 */
export function listArchitectureHistory(dir: string): ArchitectureHistory {
  const root = git(resolve(dir), ["rev-parse", "--show-toplevel"]).trim();
  const pathspecs = architecturePathspecs(root, dir);
  const log = git(root, [
    "log",
    "--first-parent",
    `--format=%H${FIELD}%P${FIELD}%an${FIELD}%aI${FIELD}%s${FIELD}%b${RECORD}`,
    "--",
    ...pathspecs,
  ]);
  const bodies = new Map<string, string>();
  const commits = log
    .split(RECORD)
    .map((record) => record.replace(/^\n/, ""))
    .filter((record) => record.length > 0)
    .map((record) => {
      const [commit, parents, author, date, subject, body] = record.split(FIELD);
      bodies.set(commit!, (body ?? "").trim());
      return {
        commit: commit!,
        parent: parents?.split(" ")[0] || null,
        author: author ?? "",
        date: date ?? "",
        subject: subject ?? "",
      };
    });
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const entries: Array<Omit<HistoryPearl, "chunk">> = hasUncommittedChanges(root, pathspecs)
    ? [
        {
          commit: null,
          parent: head,
          author: "",
          date: new Date().toISOString(),
          subject: "Uncommitted changes",
        },
        ...commits,
      ]
    : commits;
  return {
    root,
    pearls: entries.map((entry, index) => ({
      ...entry,
      chunk: Math.floor(index / HISTORY_CHUNK_SIZE),
    })),
    bodies,
  };
}

const messageRenderer = new MarkdownProseRenderer();

/**
 * Compute the entry of one pearl. A snapshot that cannot be diffed (e.g. an old
 * commit with duplicate ids) yields an entry with `error` instead of `diff`, so
 * one broken commit does not hide the rest of the history.
 */
export async function loadHistoryEntry(
  dir: string,
  history: ArchitectureHistory,
  pearl: HistoryPearl,
): Promise<HistoryEntry> {
  const body = pearl.commit ? (history.bodies.get(pearl.commit) ?? "") : "";
  const messageHtml = body ? messageRenderer.renderProse(body) : "";
  // The working tree is compared with HEAD, staged and unstaged changes alike.
  const spec: DiffSpec = pearl.commit ? { commit: pearl.commit } : { reference: "HEAD" };
  try {
    const { payload, result } = await loadDiffPayload(dir, spec);
    const architecture = result.architecture;
    const counts = architecture.documents.reduce(
      (total, document) => ({
        added: total.added + document.added,
        modified: total.modified + document.modified,
        removed: total.removed + document.removed,
      }),
      { added: 0, modified: 0, removed: 0 },
    );
    return {
      commit: pearl.commit,
      messageHtml,
      semantic:
        architecture.elements.length > 0 ||
        architecture.diagrams.length > 0 ||
        architecture.edges.length > 0 ||
        architecture.proseSections.length > 0,
      ...counts,
      diff: payload,
    };
  } catch (error) {
    return {
      commit: pearl.commit,
      messageHtml,
      semantic: false,
      added: 0,
      modified: 0,
      removed: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Compute the entries of all pearls in one chunk, in pearl order. */
export async function loadHistoryChunk(
  dir: string,
  history: ArchitectureHistory,
  chunk: number,
): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];
  for (const pearl of history.pearls.filter((candidate) => candidate.chunk === chunk)) {
    entries.push(await loadHistoryEntry(dir, history, pearl));
  }
  return entries;
}

/** Serialize values as JSON Lines. */
export function toJsonLines(values: unknown[]): string {
  return values.map((value) => `${JSON.stringify(value)}\n`).join("");
}
