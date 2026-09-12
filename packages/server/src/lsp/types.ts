// LSP types for arc42 language server

export const TextDocumentSyncKind = {
  None: 0,
  Full: 1,
  Incremental: 2,
};

export interface InitializeParams {
  processId: number | null;
  clientInfo?: { name: string; version?: string };
  capabilities: any;
  initializationOptions?: any;
}

export interface InitializeResult {
  capabilities: ServerCapabilities;
  serverInfo?: { name: string; version: string };
}

export interface ServerCapabilities {
  textDocumentSync?:
    | number
    | {
        openClose: boolean;
        change: number;
        willSave?: boolean;
        willSaveWaitUntil?: boolean;
        save?: { includeText?: boolean };
      };
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentSymbolProvider?: boolean;
  completionProvider?: { resolveProvider?: boolean; triggerCharacters?: string[] };
  hoverProvider?: boolean;
  workspace?: { workspaceFolders?: { supported: boolean; changeNotifications?: boolean | string } };
}

export interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  filterText?: string;
}

export interface Hover {
  contents: { kind: "markdown" | "plaintext"; value: string } | string;
  range?: Range;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface DocumentSymbol {
  name: string;
  kind: number;
  range?: Range;
  selectionRange?: Range;
  detail?: string;
}

export interface WorkspaceSymbolParams {
  query: string;
}
