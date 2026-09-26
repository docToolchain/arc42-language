import { access, readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import {
  computeCoverage,
  getElementsFromDocuments,
  loadWorkspaceFromDocuments,
  parseArchitectureDocument,
  parseArc42Ignore,
  validateDocumentsAsync,
  warmMermaid,
} from "@arc42/core";
import type {
  DocumentAst,
  GetDocumentsOptions,
  GetResult,
  Notation,
  ValidationContext,
  ValidateResult,
  WorkspacePayload,
} from "@arc42/core";
import { gitLsFiles } from "./git-diff.ts";
import { createAdapterForNotation } from "./notation/index.ts";
import { detectNotation, parseWorkspaceFiles } from "./workspace-parse.ts";
import type { SourceFile } from "./workspace-parse.ts";

export { gitLsFiles } from "./git-diff.ts";
export { loadDiffSnapshots, EMPTY_TREE } from "./diff-snapshots.ts";
export { loadDiffPayload } from "./diff-payload.ts";
export type { LoadedDiff } from "./diff-payload.ts";
export { listArchitectureHistory, loadCommitChange } from "./history.ts";
export type { ArchitectureCommit, ArchitectureHistory, CommitChange } from "./history.ts";
export type { DiffSnapshots, DiffSpec, Snapshot } from "./diff-snapshots.ts";

export {
  MarkdownNotationAdapter,
  AsciidocNotationAdapter,
  createAdapterForNotation,
} from "./notation/index.ts";

interface DiscoverResult {
  files: string[];
  notation: Notation;
}

/**
 * Scan dir recursively for .arc42.md or .arc42.adoc files.
 * Throws if both extensions are found (mixed workspace is not supported).
 * Returns the file list and the detected notation.
 */
export async function discoverFiles(dir: string): Promise<string[]> {
  const { files } = await discoverFilesWithNotation(dir);
  return files;
}

async function discoverFilesWithNotation(dir: string): Promise<DiscoverResult> {
  const mdFiles: string[] = [];
  const adocFiles: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        if (entry.name.endsWith(".arc42.md")) mdFiles.push(path);
        else if (entry.name.endsWith(".arc42.adoc")) adocFiles.push(path);
      }
    }
  }

  await walk(resolve(dir));

  const notation = detectNotation([...mdFiles, ...adocFiles], dir);
  return { files: notation === "asciidoc" ? adocFiles : mdFiles, notation };
}

function readSourceFiles(files: string[]): Promise<SourceFile[]> {
  return Promise.all(files.map(async (path) => ({ path, content: await readFile(path, "utf8") })));
}

export async function readWorkspaceDocuments(dir: string): Promise<DocumentAst[]> {
  const { files, notation } = await discoverFilesWithNotation(dir);
  return parseWorkspaceFiles(await readSourceFiles(files), notation);
}

async function collectPaths(dir: string, root: string): Promise<string[]> {
  const paths: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      paths.push(relative(root, path).replaceAll("\\", "/"));
      if (entry.isDirectory()) await walk(path);
    }
  }
  await walk(root);
  return paths;
}

async function findRepositoryRoot(dir: string): Promise<string> {
  let current = resolve(dir);
  while (true) {
    try {
      await access(resolve(current, ".git"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) return resolve(dir);
      current = parent;
    }
  }
}

export async function pathEvidence(
  dir: string,
  root?: string,
): Promise<NonNullable<ValidationContext["pathEvidence"]>> {
  const repositoryRoot = resolve(root ?? (await findRepositoryRoot(dir)));
  let knownPaths: string[];
  try {
    knownPaths = gitLsFiles(repositoryRoot);
  } catch {
    knownPaths = await collectPaths(dir, repositoryRoot);
  }
  return { root: repositoryRoot, knownPaths };
}

export async function loadWorkspace(dir: string): Promise<WorkspacePayload> {
  const { files, notation } = await discoverFilesWithNotation(dir);
  const documents = await parseWorkspaceFiles(await readSourceFiles(files), notation);
  const repositoryRoot = await findRepositoryRoot(dir);
  let trackedPaths: string[];
  try {
    trackedPaths = gitLsFiles(repositoryRoot);
  } catch {
    trackedPaths = await collectPaths(dir, repositoryRoot);
  }
  const payload = loadWorkspaceFromDocuments(documents);
  const coverage = computeCoverage(payload.elements, trackedPaths);
  return { ...payload, coverage, notation };
}

export async function validateWorkspace(dir: string, root?: string): Promise<ValidateResult> {
  warmMermaid();
  const { files, notation } = await discoverFilesWithNotation(dir);
  const documents = await parseWorkspaceFiles(await readSourceFiles(files), notation);
  const repositoryRoot = resolve(root ?? (await findRepositoryRoot(dir)));
  let trackedPaths: string[];
  try {
    trackedPaths = gitLsFiles(repositoryRoot);
  } catch {
    trackedPaths = await collectPaths(dir, repositoryRoot);
  }

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
    fenceDescription: createAdapterForNotation(notation).fenceDescription,
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
