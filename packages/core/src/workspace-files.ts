// Files in, model out: the one way every caller turns architecture files into
// a workspace — the filesystem adapter from disk or git, the web renderer from
// an earlier version's files. Pure: no files, folders, addresses or formats.

import { detectNotation as detectNotationOf } from "@cli42/lib/notation";
import { loadWorkspaceFromDocuments, parseArchitectureDocumentAsync } from "./arc42.ts";
import type { DocumentAst } from "./ast.ts";
import { computeCoverage } from "./coverage.ts";
import type { Notation, NotationAdapter } from "./notation/types.ts";
import type { WorkspacePayload } from "./workspace.ts";

export interface SourceFile {
  path: string;
  content: string;
}

export function isArchitectureFile(path: string): boolean {
  return path.endsWith(".arc42.md") || path.endsWith(".arc42.adoc");
}

/**
 * Detect the notation of a workspace from its architecture file paths.
 * Throws if both extensions are present (mixed workspace is not supported).
 */
export function detectNotation(paths: readonly string[], location: string): Notation {
  return detectNotationOf(
    paths,
    [
      ["markdown", ".arc42.md"],
      ["asciidoc", ".arc42.adoc"],
    ],
    location,
  );
}

/**
 * Load the adapter of a notation. Each notation sits behind its own subpath and
 * is imported on demand, so a bundle carries `marked` or `asciidoctor` only
 * when that notation is used.
 */
export async function loadNotationAdapter(notation: Notation): Promise<NotationAdapter> {
  if (notation === "asciidoc") {
    const { AsciidocNotationAdapter } = await import("./notation/asciidoc/index.ts");
    return new AsciidocNotationAdapter();
  }
  const { MarkdownNotationAdapter } = await import("./notation/markdown/index.ts");
  return new MarkdownNotationAdapter();
}

/** Parse architecture files with the notation's parser and prose renderer. */
export async function parseWorkspaceFiles(
  files: readonly SourceFile[],
  notation: Notation,
): Promise<DocumentAst[]> {
  const adapter = await loadNotationAdapter(notation);
  const parser = adapter.createParser();
  const proseRenderer = adapter.createProseRenderer();
  return Promise.all(
    files.map((file) =>
      parseArchitectureDocumentAsync(file.path, file.content, parser, proseRenderer),
    ),
  );
}

/**
 * Build the workspace of a set of architecture files: detect the notation,
 * parse, build the model and compute coverage against `trackedPaths` — every
 * path tracked in the same version, code included. `location` names the source
 * in error messages.
 */
export async function loadWorkspaceFromFiles(
  files: readonly SourceFile[],
  trackedPaths: readonly string[],
  location: string,
): Promise<WorkspacePayload> {
  const notation = detectNotation(
    files.map((file) => file.path),
    location,
  );
  const payload = loadWorkspaceFromDocuments(await parseWorkspaceFiles(files, notation));
  return { ...payload, coverage: computeCoverage(payload.elements, [...trackedPaths]), notation };
}
