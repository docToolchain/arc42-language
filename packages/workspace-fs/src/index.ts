// Public API of the filesystem workspace adapter.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  computeCoverage,
  getElementsFromDocuments,
  loadNotationAdapter,
  loadWorkspaceFromDocuments,
  loadWorkspaceFromFiles,
  parseArchitectureDocument,
  parseArc42Ignore,
  parseWorkspaceFiles,
  validateDocumentsAsync,
  warmMermaid,
} from "@arc42/core";
import type { GetDocumentsOptions, GetResult, ValidateResult, WorkspacePayload } from "@arc42/core";
import { discoverFilesWithNotation, readSourceFiles, readWorkspaceDocuments } from "./discovery.ts";
import { pathEvidence } from "./path-evidence.ts";

export { gitLsFiles } from "./git-diff.ts";
export { loadDiffSnapshots, EMPTY_TREE } from "./diff-snapshots.ts";
export { loadDiffPayload } from "./diff-payload.ts";
export type { LoadedDiff } from "./diff-payload.ts";
export { listArchitectureHistory, loadCommitChange } from "./history.ts";
export { readArchitectureBlob, readCommitFiles } from "./snapshot.ts";
export type { CommitFiles } from "./snapshot.ts";
export type { ArchitectureCommit, ArchitectureHistory, CommitChange } from "./history.ts";
export type { DiffSnapshots, DiffSpec, Snapshot } from "./diff-snapshots.ts";
export { discoverFiles, readWorkspaceDocuments } from "./discovery.ts";
export { pathEvidence } from "./path-evidence.ts";

export async function loadWorkspace(dir: string): Promise<WorkspacePayload> {
  const { files } = await discoverFilesWithNotation(dir);
  const { knownPaths } = await pathEvidence(dir);
  return loadWorkspaceFromFiles(await readSourceFiles(files), knownPaths, dir);
}

export async function validateWorkspace(dir: string, root?: string): Promise<ValidateResult> {
  warmMermaid();
  const { files, notation } = await discoverFilesWithNotation(dir);
  const documents = await parseWorkspaceFiles(await readSourceFiles(files), notation);
  const { root: repositoryRoot, knownPaths: trackedPaths } = await pathEvidence(dir, root);

  // Load .arc42ignore from repository root (if it exists)
  let coverageIgnore: Set<string> | undefined;
  try {
    const ignoreContent = await readFile(resolve(repositoryRoot, ".arc42ignore"), "utf-8");
    coverageIgnore = parseArc42Ignore(ignoreContent);
  } catch {
    // No .arc42ignore — all uncovered paths will be reported
  }

  // Build workspace once and reuse elements for coverage computation
  const payload = loadWorkspaceFromDocuments(documents);
  const coverage = computeCoverage(payload.elements, trackedPaths);
  return validateDocumentsAsync(documents, {
    pathEvidence: { root: repositoryRoot, knownPaths: trackedPaths },
    coverage,
    coverageIgnore,
    fenceDescription: (await loadNotationAdapter(notation)).fenceDescription,
  });
}

export async function getElements(opts: {
  dir: string;
  query: GetDocumentsOptions["query"];
}): Promise<GetResult> {
  const documents = await readWorkspaceDocuments(opts.dir);
  return getElementsFromDocuments({ documents, query: opts.query });
}

// Keep a re-export of the sync parseArchitectureDocument for consumers that
// call it directly and don't need a renderer.
export { parseArchitectureDocument };
