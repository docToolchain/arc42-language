import { isArchitectureFile } from "@arc42/core";

import { git, workspaceLocation } from "./git-diff.ts";

/** The files of the workspace at one commit, as git records them. */
export interface CommitFiles {
  /** Architecture files of the workspace: repository-relative path → git blob id. */
  files: Record<string, string>;
  /** Every tracked path of the repository at this commit, code included, in git's order. */
  paths: string[];
}

const COMMIT_ID = /^[0-9a-f]{40}$/;

// Commits never change: their files are read from git once per repository.
const commitFilesCache = new Map<string, CommitFiles>();

/**
 * Read the file list of a commit: every tracked path, and the blob ids of the
 * workspace's architecture files. Takes a full commit id only — never a
 * branch or other reference. Git failures are raised.
 */
export function readCommitFiles(dir: string, commit: string): CommitFiles {
  if (!COMMIT_ID.test(commit)) throw new Error(`Not a full commit id: ${commit}`);
  const { root, inWorkspace } = workspaceLocation(dir);
  const key = `${root}\0${commit}`;
  const cached = commitFilesCache.get(key);
  if (cached) return cached;
  const files: Record<string, string> = {};
  const paths: string[] = [];
  // Each record: "<mode> <type> <id>\t<path>"; -z keeps unusual names unquoted.
  for (const record of git(root, ["ls-tree", "-r", "-z", "--full-tree", commit]).split("\0")) {
    if (record === "") continue;
    const tab = record.indexOf("\t");
    const [, type, id] = record.slice(0, tab).split(" ");
    const path = record.slice(tab + 1);
    paths.push(path);
    if (type === "blob" && isArchitectureFile(path) && inWorkspace(path)) files[path] = id!;
  }
  const result = { files, paths };
  commitFilesCache.set(key, result);
  return result;
}

/**
 * Read one architecture file by its blob id. Only a blob that is an
 * architecture file of the workspace in one of `commits` is read; any other id
 * — code, or a file of another workspace — is refused, so serving blobs never
 * exposes the rest of the repository.
 */
export function readArchitectureBlob(dir: string, commits: readonly string[], id: string): string {
  const allowed = commits.some((commit) =>
    Object.values(readCommitFiles(dir, commit).files).includes(id),
  );
  if (!allowed) throw new Error(`Not an architecture file of this history: ${id}`);
  return git(workspaceLocation(dir).root, ["cat-file", "blob", id]);
}
