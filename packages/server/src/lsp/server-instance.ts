// LSP server implementation for arc42 architecture documentation
// This provides the actual LSP functionality that the stdio wrapper calls

import {
  TextDocumentSyncKind,
  type InitializeParams,
  type InitializeResult,
  type ServerCapabilities,
  type CompletionItem,
  type Hover,
  type DocumentSymbol,
  type WorkspaceSymbolParams,
} from "./types.ts";
import { parseArchitectureDocument, validateDocuments, type Diagnostic } from "@arc42/core";

export type PublishDiagnostics = (params: {
  uri: string;
  diagnostics: Array<{
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    severity: number;
    code: string;
    message: string;
  }>;
}) => void;

// ============================================================================
// LSP Server Class
// ============================================================================

export class LspServer {
  private capabilities: ServerCapabilities;
  private documents: Map<string, { text: string; version?: number }> = new Map();

  constructor(private readonly publishDiagnostics: PublishDiagnostics = () => {}) {
    this.capabilities = {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      completionProvider: { triggerCharacters: [":", " "] },
      hoverProvider: true,
      workspace: {
        workspaceFolders: {
          supported: true,
          changeNotifications: true,
        },
      },
    };
  }

  initialize(_params: InitializeParams): InitializeResult {
    return {
      capabilities: {
        ...this.capabilities,
        textDocumentSync: TextDocumentSyncKind.Incremental,
      },
      serverInfo: {
        name: "arc42-language-server",
        version: "0.1.0",
      },
    };
  }

  initialized(): void {
    // Initialization complete
  }

  didChangeConfiguration(_params: any): void {
    // Configuration changed
  }

  didOpenTextDocument(params: any): void {
    const { textDocument } = params;
    if (textDocument?.uri && typeof textDocument.text === "string") {
      this.documents.set(textDocument.uri, {
        text: textDocument.text,
        version: textDocument.version,
      });
      this.validateDocument(textDocument.uri, textDocument.text);
    }
  }

  didChangeTextDocument(params: any): void {
    const { textDocument, contentChanges } = params;
    if (!textDocument?.uri || !Array.isArray(contentChanges) || contentChanges.length === 0) return;

    const document = this.documents.get(textDocument.uri);
    if (
      !document ||
      (typeof textDocument.version === "number" &&
        typeof document.version === "number" &&
        textDocument.version <= document.version)
    )
      return;

    let text = document.text;
    for (const change of contentChanges) {
      if (typeof change?.text !== "string") continue;
      if (!change.range) {
        text = change.text;
        continue;
      }
      const start = positionToOffset(text, change.range.start);
      const end = positionToOffset(text, change.range.end);
      if (start === undefined || end === undefined || start > end) continue;
      text = text.slice(0, start) + change.text + text.slice(end);
    }
    this.documents.set(textDocument.uri, { text, version: textDocument.version });
    this.validateDocument(textDocument.uri, text);
  }

  private validateDocument(uri: string, text: string): void {
    const result = validateDocuments([parseArchitectureDocument(uri, text)]);
    this.publishDiagnostics({
      uri,
      diagnostics: result.diagnostics.map((diagnostic) => this.toLspDiagnostic(diagnostic, text)),
    });
  }

  private toLspDiagnostic(diagnostic: Diagnostic, text: string) {
    const start = diagnostic.range?.start ?? offsetForLine(text, (diagnostic.line ?? 1) - 1);
    const end = diagnostic.range?.end ?? start + 1;
    return {
      range: { start: positionAt(text, start), end: positionAt(text, end) },
      severity: diagnostic.severity === "error" ? 1 : diagnostic.severity === "warning" ? 2 : 4,
      code: diagnostic.code,
      message: diagnostic.message,
    };
  }

  didCloseTextDocument(params: any): void {
    const { textDocument } = params;
    if (textDocument && textDocument.uri) {
      this.documents.delete(textDocument.uri);
    }
  }

  definition(_params: any): any {
    return null;
  }

  references(_params: any): any {
    return null;
  }

  documentSymbol(_params: any): any {
    return [];
  }

  completion(_params: any): CompletionItem[] {
    // Return basic block type completions
    const blockTypes = [
      "building-block",
      "decision",
      "risk",
      "quality-goal",
      "concept",
      "runtime-scenario",
      "deployment-node",
      "interface",
      "actor",
      "solution-strategy",
      "constraint",
      "context-diagram",
      "building-block-diagram",
      "sequence-diagram",
      "deployment-diagram",
      "glossary-term",
    ];

    return blockTypes.map((type) => ({
      label: type,
      kind: 13, // CompletionItemKind.Keyword
      detail: "arc42 block type",
      documentation: `A ${type} block for architecture documentation`,
      insertText: type,
      filterText: type,
    }));
  }

  hover(_params: any): Hover | null {
    return {
      contents: {
        kind: "markdown",
        value: "## Arc42 Language Element\n\nArc42 language element.",
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    };
  }

  workspaceSymbol(_params: WorkspaceSymbolParams): DocumentSymbol[] {
    return [];
  }

  didChangeWatchedFiles(_params: any): void {
    // File watched changed
  }

  // Get document content by URI
  getDocument(uri: string): string | undefined {
    return this.documents.get(uri)?.text;
  }

  // Get all document URIs
  getDocumentUris(): string[] {
    return Array.from(this.documents.keys());
  }
}

function positionToOffset(text: string, position: any): number | undefined {
  if (
    !Number.isInteger(position?.line) ||
    !Number.isInteger(position?.character) ||
    position.line < 0 ||
    position.character < 0
  )
    return undefined;

  let line = 0;
  let offset = 0;
  while (line < position.line) {
    const newline = text.indexOf("\n", offset);
    if (newline < 0) return undefined;
    offset = newline + 1;
    line++;
  }
  const lineEnd = text.indexOf("\n", offset);
  const end = lineEnd < 0 ? text.length : lineEnd;
  const result = offset + position.character;
  return result <= end ? result : undefined;
}

function offsetForLine(text: string, line: number): number {
  let offset = 0;
  for (let index = 0; index < line; index++) {
    const newline = text.indexOf("\n", offset);
    if (newline < 0) return text.length;
    offset = newline + 1;
  }
  return offset;
}

function positionAt(text: string, offset: number): { line: number; character: number } {
  const bounded = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, bounded);
  const line = (before.match(/\n/g) ?? []).length;
  const lineStart = before.lastIndexOf("\n") + 1;
  return { line, character: bounded - lineStart };
}

// ============================================================================
// Type Exports
// ============================================================================

export {
  type InitializeParams,
  type InitializeResult,
  type ServerCapabilities,
  type TextDocumentSyncKind,
  type CompletionItem,
  type Hover,
  type DocumentSymbol,
  type WorkspaceSymbolParams,
};
