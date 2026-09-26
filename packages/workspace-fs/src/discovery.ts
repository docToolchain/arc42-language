// Discovery and reading of the architecture documents of a workspace directory.
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { detectNotation, parseWorkspaceFiles } from "@arc42/core";
import type { DocumentAst, Notation, SourceFile } from "@arc42/core";

export interface DiscoverResult {
  files: string[];
  notation: Notation;
}

/**
 * Scan dir recursively for .arc42.md or .arc42.adoc files.
 * Throws if both extensions are found (mixed workspace is not supported).
 * Returns the file list and the detected notation.
 */
export async function discoverFilesWithNotation(dir: string): Promise<DiscoverResult> {
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

/** Scan dir recursively for architecture documents; see discoverFilesWithNotation. */
export async function discoverFiles(dir: string): Promise<string[]> {
  const { files } = await discoverFilesWithNotation(dir);
  return files;
}

export function readSourceFiles(files: string[]): Promise<SourceFile[]> {
  return Promise.all(files.map(async (path) => ({ path, content: await readFile(path, "utf8") })));
}

export async function readWorkspaceDocuments(dir: string): Promise<DocumentAst[]> {
  const { files, notation } = await discoverFilesWithNotation(dir);
  return parseWorkspaceFiles(await readSourceFiles(files), notation);
}
