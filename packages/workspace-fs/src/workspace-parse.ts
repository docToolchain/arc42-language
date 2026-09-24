import { parseArchitectureDocumentAsync } from "@arc42/core";
import type { DocumentAst, Notation } from "@arc42/core";
import { createAdapterForNotation } from "./notation/index.ts";

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
export function detectNotation(paths: string[], location: string): Notation {
  const markdown = paths.filter((path) => path.endsWith(".arc42.md")).length;
  const asciidoc = paths.filter((path) => path.endsWith(".arc42.adoc")).length;
  if (markdown > 0 && asciidoc > 0) {
    throw new Error(
      `Mixed notation workspace: found both .arc42.md (${markdown}) and .arc42.adoc (${asciidoc}) files in ${location}. Use a single notation throughout the workspace.`,
    );
  }
  return asciidoc > 0 ? "asciidoc" : "markdown";
}

/** Parse architecture files with the notation's parser and prose renderer. */
export function parseWorkspaceFiles(
  files: SourceFile[],
  notation: Notation,
): Promise<DocumentAst[]> {
  const adapter = createAdapterForNotation(notation);
  const parser = adapter.createParser();
  const proseRenderer = adapter.createProseRenderer();
  return Promise.all(
    files.map((file) =>
      parseArchitectureDocumentAsync(file.path, file.content, parser, proseRenderer),
    ),
  );
}
