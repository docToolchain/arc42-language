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

test("synchronizes full and incremental document changes in version order", () => {
  const server = new LspServer();
  const uri = "file:///document.arc42.md";

  server.didOpenTextDocument({ textDocument: { uri, version: 1, text: "one\ntwo" } });
  server.didChangeTextDocument({
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: "zero\ntwo" }],
  });
  server.didChangeTextDocument({
    textDocument: { uri, version: 3 },
    contentChanges: [
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } }, text: "1" },
      { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } }, text: "2" },
    ],
  });

  expect(server.getDocument(uri)).toBe("1\n2");

  server.didChangeTextDocument({
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: "stale" }],
  });
  expect(server.getDocument(uri)).toBe("1\n2");
});

test("applies ranges using UTF-16 positions across CRLF and Unicode", () => {
  const server = new LspServer();
  const uri = "file:///unicode.arc42.md";

  server.didOpenTextDocument({ textDocument: { uri, version: 4, text: "😀\r\nCafé" } });
  server.didChangeTextDocument({
    textDocument: { uri, version: 5 },
    contentChanges: [
      { range: { start: { line: 0, character: 2 }, end: { line: 0, character: 2 } }, text: "!" },
      { range: { start: { line: 1, character: 3 }, end: { line: 1, character: 5 } }, text: "é" },
    ],
  });

  expect(server.getDocument(uri)).toBe("😀!\r\nCafé");
});

test("removes documents on close", () => {
  const server = new LspServer();
  const uri = "file:///closed.arc42.md";
  server.didOpenTextDocument({ textDocument: { uri, version: 1, text: "content" } });
  server.didCloseTextDocument({ textDocument: { uri } });
  expect(server.getDocument(uri)).toBeUndefined();
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
