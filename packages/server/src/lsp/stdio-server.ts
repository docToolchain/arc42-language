// Stdio-based LSP server implementation for subprocess testing
// This implements the JSON-RPC protocol with Content-Length framing

import { LspServer } from "../lsp/server-instance.ts";

// ============================================================================
// LSP Error Codes (from LSP 3.17 spec)
// ============================================================================

export const LSPErrorCodes = {
  // Defined by JSON RPC
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  serverErrorStart: -32099,
  serverErrorEnd: -32000,
  ServerNotInitialized: -32002,
  UnknownErrorCode: -32001,

  // Defined by the LSP
  RequestCancelled: -32800,
  ContentModified: -32801,
};

// ============================================================================
// JSON-RPC Message Types
// ============================================================================

export interface LSPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

export interface LSPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: LSPErrorObject;
}

export interface LSPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

export interface LSPErrorObject {
  code: number;
  message: string;
  data?: any;
}

export type LSPMessage = LSPRequest | LSPResponse | LSPNotification;

// ============================================================================
// Stdio LSP Server
// ============================================================================

export class StdioLspServer {
  private server: LspServer;
  private buffer = Buffer.alloc(0);
  private pendingRequest: LSPRequest | null = null;
  private requestProcessing = false;

  constructor() {
    this.server = new LspServer();
    this.setupStdio();
  }

  private setupStdio(): void {
    process.stdin.on("data", (data: Buffer) => this.handleInput(data));
    process.stdin.on("end", () => this.handleExit());
  }

  private handleInput(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length > 0) {
      const separator = this.buffer.indexOf(Buffer.from("\r\n\r\n"));
      if (separator < 0) break;
      const header = this.buffer.subarray(0, separator).toString("ascii");
      const headerMatch = /^Content-Length: (\d+)$/i.exec(header);
      if (!headerMatch) throw new Error(`Invalid LSP header: ${header}`);
      const contentLength = Number(headerMatch[1]);
      const bodyStart = separator + 4;
      if (this.buffer.length < bodyStart + contentLength) break;
      const body = this.buffer.subarray(bodyStart, bodyStart + contentLength);
      this.buffer = this.buffer.subarray(bodyStart + contentLength);

      try {
        const message = JSON.parse(body.toString("utf8")) as LSPMessage;
        void this.handleMessage(message);
      } catch (e) {
        console.error("Failed to parse LSP message:", e);
        this.sendError(null, LSPErrorCodes.ParseError, "Failed to parse JSON");
      }
    }
  }

  private async handleMessage(message: LSPMessage): Promise<void> {
    // Check if it's a request
    if (message.jsonrpc === "2.0" && "id" in message && "method" in message) {
      const request = message as LSPRequest;
      void this.handleRequest(request);
      return;
    }

    // Check if it's a response
    if (
      message.jsonrpc === "2.0" &&
      "id" in message &&
      ("result" in message || "error" in message)
    ) {
      console.warn("Received response from server - this should not happen");
      return;
    }

    // It's a notification
    if (message.jsonrpc === "2.0" && "method" in message) {
      await this.handleNotification(message as LSPNotification);
    }
  }

  private async handleRequest(request: LSPRequest): Promise<void> {
    try {
      let result: any = null;

      switch (request.method) {
        case "initialize":
          result = this.server.initialize(request.params);
          break;
        case "shutdown":
          result = null; // No response content, but we send response
          break;
        case "textDocument/didOpen":
          this.server.didOpenTextDocument(request.params);
          return; // Notifications don't get responses
        case "textDocument/didChange":
          this.server.didChangeTextDocument(request.params);
          return;
        case "textDocument/didClose":
          this.server.didCloseTextDocument(request.params);
          return;
        case "textDocument/completion":
          result = this.server.completion(request.params);
          break;
        case "textDocument/hover":
          result = this.server.hover(request.params);
          break;
        case "textDocument/documentSymbol":
          result = this.server.documentSymbol(request.params);
          break;
        case "workspace/symbol":
          result = this.server.workspaceSymbol(request.params);
          break;
        case "initialized":
          this.server.initialized();
          return; // Initialized is a notification
        default:
          this.sendError(
            request,
            LSPErrorCodes.MethodNotFound,
            `Method not found: ${request.method}`,
          );
          return;
      }

      this.sendResponse(request.id, result);
    } catch (e) {
      this.sendError(request, LSPErrorCodes.InternalError, (e as Error).message);
    }
  }

  private async handleNotification(notification: LSPNotification): Promise<void> {
    switch (notification.method) {
      case "initialized":
        this.server.initialized();
        break;
      case "textDocument/didOpen":
        this.server.didOpenTextDocument(notification.params);
        break;
      case "textDocument/didChange":
        this.server.didChangeTextDocument(notification.params);
        break;
      case "textDocument/didClose":
        this.server.didCloseTextDocument(notification.params);
        break;
      case "$/cancelRequest":
        // Handle cancellation
        console.log("Cancellation requested");
        break;
      default:
        console.warn(`Unknown notification: ${notification.method}`);
    }
  }

  private sendResponse(id: number | string, result: any): void {
    const response: LSPResponse = {
      jsonrpc: "2.0",
      id,
      result,
    };
    this.sendLSPMessage(response);
  }

  private sendError(request: LSPRequest | null, code: number, message: string, data?: any): void {
    const response: LSPResponse = {
      jsonrpc: "2.0",
      id: request?.id ?? 0,
      error: {
        code,
        message,
        data,
      },
    };
    this.sendLSPMessage(response);
  }

  private sendLSPMessage(message: LSPMessage): void {
    const body = JSON.stringify(message);
    const headers = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
    process.stdout.write(headers + body, "utf8");
  }

  private handleExit(): void {
    process.exit(0);
  }

  // Expose server for testing
  getLspServer(): LspServer {
    return this.server;
  }
}

// ============================================================================
// Entry Point
// ============================================================================

export function startStdioServer(): StdioLspServer {
  return new StdioLspServer();
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startStdioServer();
}
