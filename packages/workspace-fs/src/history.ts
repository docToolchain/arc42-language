import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { DiffPayload } from "@arc42/core";

import { loadDiffPayload } from "./diff-payload.ts";
import type { DiffSpec } from "./diff-snapshots.ts";
import { git } from "./git-diff.ts";

/** A commit that touched architecture documents, or the uncommitted changes. */
export interface ArchitectureCommit {
  /** Commit id; null for uncommitted changes in the working tree. */
  commit: string | null;
  /** First parent; null for a root commit. For the working tree: HEAD. */
  parent: string | null;
  author: string;
  /** ISO 8601 author date; for the working tree, when it was read. */
  date: string;
  subject: string;
  /** Raw commit message body; empty when there is none. */
  body: string;
}

export interface ArchitectureHistory {
  /** Repository root. */
  root: string;
  /** Newest first; the uncommitted changes lead when there are any. */
  commits: ArchitectureCommit[];
}

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
 * workspace in `dir`, newest first, led by the uncommitted changes when there
 * are any. Throws outside a Git repository.
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
  const commits: ArchitectureCommit[] = log
    .split(RECORD)
    .map((record) => record.replace(/^\n/, ""))
    .filter((record) => record.length > 0)
    .map((record) => {
      const [commit, parents, author, date, subject, body] = record.split(FIELD);
      return {
        commit: commit!,
        parent: parents?.split(" ")[0] || null,
        author: author ?? "",
        date: date ?? "",
        subject: subject ?? "",
        body: (body ?? "").trim(),
      };
    });
  if (!hasUncommittedChanges(root, pathspecs)) return { root, commits };
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const uncommitted: ArchitectureCommit = {
    commit: null,
    parent: head,
    author: "",
    date: new Date().toISOString(),
    subject: "Uncommitted changes",
    body: "",
  };
  return { root, commits: [uncommitted, ...commits] };
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
  // The working tree is compared with HEAD, staged and unstaged changes alike.
  const spec: DiffSpec = commit.commit ? { commit: commit.commit } : { reference: "HEAD" };
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
      commit: commit.commit,
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
      commit: commit.commit,
      semantic: false,
      added: 0,
      modified: 0,
      removed: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
