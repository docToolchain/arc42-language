import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { computeCoverage, loadWorkspaceFromDocuments } from "@arc42/core";
import type { FileChange, WorkspacePayload } from "@arc42/core";

import { git, parseHunks } from "./git-diff.ts";
import { detectNotation, isArchitectureFile, parseWorkspaceFiles } from "./workspace-parse.ts";

/**
 * Which two snapshots to compare, following `git diff` semantics:
 *
 * | spec                          | base            | head         |
 * |-------------------------------|-----------------|--------------|
 * | `{}`                          | index           | working tree |
 * | `{ reference }`               | commit          | working tree |
 * | `{ staged: true }`            | HEAD            | index        |
 * | `{ staged: true, reference }` | commit          | index        |
 * | `{ reference: "a..b" }`       | commit a        | commit b     |
 * | `{ reference: "a...b" }`      | merge-base(a,b) | commit b     |
 */
export interface DiffSpec {
  reference?: string;
  staged?: boolean;
}

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
  /** Changed line ranges of every changed file, repository-relative. */
  changes: FileChange[];
  patch: string;
}

interface SnapshotSource {
  label: string;
  paths(): string[];
  read(path: string): string;
}

function nulSeparated(output: string): string[] {
  return output.split("\0").filter(Boolean);
}

function commitSource(root: string, commit: string): SnapshotSource {
  return {
    label: commit,
    paths: () => nulSeparated(git(root, ["ls-tree", "-r", "-z", "--name-only", commit])),
    read: (path) => git(root, ["show", `${commit}:${path}`]),
  };
}

function indexSource(root: string): SnapshotSource {
  return {
    label: "index",
    paths: () => nulSeparated(git(root, ["ls-files", "-z"])),
    read: (path) => git(root, ["show", `:${path}`]),
  };
}

function workingTreeSource(root: string): SnapshotSource {
  return {
    label: "working tree",
    paths: () => {
      const deleted = new Set(nulSeparated(git(root, ["ls-files", "-z", "--deleted"])));
      return nulSeparated(git(root, ["ls-files", "-z"])).filter((path) => !deleted.has(path));
    },
    read: (path) => readFileSync(join(root, path), "utf8"),
  };
}

function resolveCommit(root: string, reference: string): string {
  return git(root, ["rev-parse", "--verify", `${reference}^{commit}`]).trim();
}

function indexMatchesHead(root: string): boolean {
  try {
    execFileSync("git", ["-C", root, "diff", "--cached", "--quiet"]);
    return true;
  } catch {
    return false;
  }
}

interface Comparison {
  base: SnapshotSource;
  head: SnapshotSource;
  baseCommit: string;
  acceptanceBase?: string;
  patchArgs: string[];
}

function comparison(root: string, spec: DiffSpec): Comparison {
  const range = spec.reference ? /^(.*?)(\.\.\.?)(.*)$/.exec(spec.reference) : null;
  if (range) {
    if (spec.staged) {
      throw new Error(`A commit range (${spec.reference}) cannot be combined with --staged`);
    }
    const from = resolveCommit(root, range[1] || "HEAD");
    const to = resolveCommit(root, range[3] || "HEAD");
    const baseCommit = range[2] === "..." ? git(root, ["merge-base", from, to]).trim() : from;
    return {
      base: commitSource(root, baseCommit),
      head: commitSource(root, to),
      baseCommit,
      acceptanceBase: baseCommit,
      patchArgs: [baseCommit, to],
    };
  }
  if (spec.staged) {
    const baseCommit = resolveCommit(root, spec.reference ?? "HEAD");
    return {
      base: commitSource(root, baseCommit),
      head: indexSource(root),
      baseCommit,
      acceptanceBase: baseCommit,
      patchArgs: ["--cached", baseCommit],
    };
  }
  if (spec.reference) {
    const baseCommit = resolveCommit(root, spec.reference);
    return {
      base: commitSource(root, baseCommit),
      head: workingTreeSource(root),
      baseCommit,
      acceptanceBase: baseCommit,
      patchArgs: [baseCommit],
    };
  }
  const baseCommit = resolveCommit(root, "HEAD");
  return {
    base: indexSource(root),
    head: workingTreeSource(root),
    baseCommit,
    acceptanceBase: indexMatchesHead(root) ? baseCommit : undefined,
    patchArgs: [],
  };
}

async function loadSnapshot(
  source: SnapshotSource,
  inWorkspace: (path: string) => boolean,
): Promise<Snapshot> {
  const paths = source.paths();
  const files = paths.filter((path) => isArchitectureFile(path) && inWorkspace(path));
  const notation = detectNotation(files, source.label);
  const documents = await parseWorkspaceFiles(
    files.map((path) => ({ path, content: source.read(path) })),
    notation,
  );
  const payload = loadWorkspaceFromDocuments(documents);
  return {
    label: source.label,
    knownPaths: new Set(paths),
    payload: { ...payload, coverage: computeCoverage(payload.elements, paths), notation },
  };
}

/**
 * Load the base and head snapshots of the workspace in `dir` as full workspace
 * payloads, plus the changed line ranges between them. Both snapshots are
 * parsed with the workspace's notation, so AsciiDoc workspaces are supported
 * on both sides. Git failures (no repository, unknown reference, unreadable
 * blob) are raised, never skipped.
 */
export async function loadDiffSnapshots(dir: string, spec: DiffSpec = {}): Promise<DiffSnapshots> {
  const root = git(resolve(dir), ["rev-parse", "--show-toplevel"]).trim();
  const workspace = relative(root, realpathSync(resolve(dir))).replaceAll("\\", "/");
  const inWorkspace = (path: string) =>
    workspace === "" || path === workspace || path.startsWith(`${workspace}/`);
  const { base, head, baseCommit, acceptanceBase, patchArgs } = comparison(root, spec);
  const patch = git(root, ["diff", "--unified=0", "--no-renames", ...patchArgs, "--"]);
  return {
    root,
    base: await loadSnapshot(base, inWorkspace),
    head: await loadSnapshot(head, inWorkspace),
    baseCommit,
    acceptanceBase,
    changes: parseHunks(patch),
    patch,
  };
}
