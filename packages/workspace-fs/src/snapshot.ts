import { isArchitectureFile } from "@arc42/core";
import { readCommitFiles as readFiles, readDocumentBlob } from "@cli42/lib/git";
import type { CommitFiles } from "@cli42/lib/git";

export type { CommitFiles } from "@cli42/lib/git";

/**
 * Read the file list of a commit: every tracked path, and the blob ids of the
 * workspace's architecture files. Takes a full commit id only — never a
 * branch or other reference. Git failures are raised.
 */
export function readCommitFiles(dir: string, commit: string): CommitFiles {
  return readFiles(dir, commit, isArchitectureFile);
}

/**
 * Read one architecture file by its blob id. Only a blob that is an
 * architecture file of the workspace in one of `commits` is read; any other id
 * — code, or a file of another workspace — is refused, so serving blobs never
 * exposes the rest of the repository.
 */
export function readArchitectureBlob(dir: string, commits: readonly string[], id: string): string {
  return readDocumentBlob(
    dir,
    commits,
    id,
    isArchitectureFile,
    "Not an architecture file of this history",
  );
}
