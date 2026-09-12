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

// ============================================================================
// LSP Server Class
// ============================================================================

export class LspServer {
  private capabilities: ServerCapabilities;
  private documents: Map<string, string> = new Map();

  constructor() {
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
    if (textDocument && textDocument.uri && textDocument.text) {
      this.documents.set(textDocument.uri, textDocument.text);
    }
  }

  didChangeTextDocument(params: any): void {
    const { textDocument, contentChanges } = params;
    if (textDocument && contentChanges && contentChanges.length > 0) {
      const uri = textDocument.uri;
      const newText = contentChanges[contentChanges.length - 1].text;
      this.documents.set(uri, newText);
    }
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
    return this.documents.get(uri);
  }

  // Get all document URIs
  getDocumentUris(): string[] {
    return Array.from(this.documents.keys());
  }
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
