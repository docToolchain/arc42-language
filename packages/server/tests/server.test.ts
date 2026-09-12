// Tests for arc42 language server

import { expect, test } from "vite-plus/test";
import { LspServer } from "../src/lsp/server-instance.ts";

test("LspServer initializes with correct capabilities", () => {
  const server = new LspServer();
  const params = { processId: 123, capabilities: {} };
  const result = server.initialize(params);

  expect(result.capabilities.definitionProvider).toBe(true);
  expect(result.capabilities.referencesProvider).toBe(true);
  expect(result.capabilities.documentSymbolProvider).toBe(true);
  expect(result.capabilities.completionProvider).toBeDefined();
  expect(result.capabilities.hoverProvider).toBe(true);
  expect(result.serverInfo?.name).toBe("arc42-language-server");
  expect(result.serverInfo?.version).toBe("0.1.0");
});

test("LspServer handles initialized event", () => {
  const server = new LspServer();
  expect(() => server.initialized()).not.toThrow();
});

test("LspServer handlers return expected values", () => {
  const server = new LspServer();

  expect(server.definition({})).toBeNull();
  expect(server.references({})).toBeNull();
  expect(server.documentSymbol({})).toEqual([]);
  expect(server.completion({})).toHaveLength(16);
  expect(server.hover({})).toBeDefined();
  expect(server.hover({})?.contents).toBeDefined();
  expect(server.hover({})?.range).toBeDefined();

  expect(() => server.didChangeConfiguration({})).not.toThrow();
  expect(() => server.didOpenTextDocument({})).not.toThrow();
  expect(() => server.didChangeTextDocument({})).not.toThrow();
  expect(() => server.didCloseTextDocument({})).not.toThrow();
  expect(() => server.didChangeWatchedFiles({})).not.toThrow();
});
