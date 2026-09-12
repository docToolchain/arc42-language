// LSP server entry point for arc42
// Stdio LSP server implementation

import { startStdioServer } from "./lsp/stdio-server.ts";

// Start the stdio LSP server
const server = startStdioServer();

// Export for testing
export { server, startStdioServer };

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  // Server is already started by startStdioServer()
}

// Make startStdioServer available as default export for testing
export default startStdioServer;
