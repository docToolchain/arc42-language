// Tests for arc42 language server

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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

test("synchronizes full and incremental document changes in version order", async () => {
  const server = new LspServer();
  const uri = "file:///document.arc42.md";

  await server.didOpenTextDocument({ textDocument: { uri, version: 1, text: "one\ntwo" } });
  await server.didChangeTextDocument({
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: "zero\ntwo" }],
  });
  await server.didChangeTextDocument({
    textDocument: { uri, version: 3 },
    contentChanges: [
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } }, text: "1" },
      { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } }, text: "2" },
    ],
  });

  expect(server.getDocument(uri)).toBe("1\n2");

  await server.didChangeTextDocument({
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: "stale" }],
  });
  expect(server.getDocument(uri)).toBe("1\n2");
});

test("applies ranges using UTF-16 positions across CRLF and Unicode", async () => {
  const server = new LspServer();
  const uri = "file:///unicode.arc42.md";

  await server.didOpenTextDocument({ textDocument: { uri, version: 4, text: "😀\r\nCafé" } });
  await server.didChangeTextDocument({
    textDocument: { uri, version: 5 },
    contentChanges: [
      { range: { start: { line: 0, character: 2 }, end: { line: 0, character: 2 } }, text: "!" },
      { range: { start: { line: 1, character: 3 }, end: { line: 1, character: 5 } }, text: "é" },
    ],
  });

  expect(server.getDocument(uri)).toBe("😀!\r\nCafé");
});

test("removes documents on close", async () => {
  const server = new LspServer();
  const uri = "file:///closed.arc42.md";
  await server.didOpenTextDocument({ textDocument: { uri, version: 1, text: "content" } });
  server.didCloseTextDocument({ textDocument: { uri } });
  expect(server.getDocument(uri)).toBeUndefined();
});

test("revalidates cross-file references against unsaved open-document overlays", async () => {
  const root = await mkdtemp(join(tmpdir(), "arc42-server-"));
  const sourceUri = pathToFileURL(join(root, "source.arc42.md")).href;
  const targetPath = join(root, "target.arc42.md");
  const targetUri = pathToFileURL(targetPath).href;
  const published: Array<{ uri: string; diagnostics: Array<{ code: string }> }> = [];
  const server = new LspServer((params) => published.push(params));

  try {
    await writeFile(
      join(root, "source.arc42.md"),
      "# Source\n\n:::building-block\nid: source\ntitle: Source\nparent: target\n:::\n",
    );
    await writeFile(targetPath, "# Target\n\n:::building-block\nid: target\ntitle: Target\n:::\n");
    server.initialize({
      processId: null,
      capabilities: {},
      workspaceFolders: [{ uri: pathToFileURL(root).href }],
    });

    await server.didOpenTextDocument({
      textDocument: {
        uri: sourceUri,
        version: 1,
        text: await readFile(join(root, "source.arc42.md"), "utf8"),
      },
    });
    expect(
      published
        .find((item) => item.uri === sourceUri)
        ?.diagnostics.map((diagnostic) => diagnostic.code),
    ).not.toContain("E002");

    await server.didOpenTextDocument({
      textDocument: { uri: targetUri, version: 1, text: "# Target\n\nValid prose.\n" },
    });
    const sourceDiagnostics = published.filter((item) => item.uri === sourceUri).at(-1);
    expect(sourceDiagnostics?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("E002");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("LspServer handlers return expected values", async () => {
  const server = new LspServer();

  expect(server.definition({})).toBeNull();
  expect(server.references({})).toBeNull();
  expect(server.documentSymbol({})).toEqual([]);
  expect(server.completion({})).toEqual([]);
  const uri = "file:///completion.arc42.md";
  await server.didOpenTextDocument({
    textDocument: { uri, version: 1, text: ":::building-block\n\n:::" },
  });
  expect(
    server.completion({
      textDocument: { uri },
      position: { line: 1, character: 0 },
    }),
  ).toContainEqual({ label: "technology", kind: 10, insertText: "technology: " });
  expect(server.hover({})).toBeDefined();
  expect(server.hover({})?.contents).toBeDefined();
  expect(server.hover({})?.range).toBeDefined();

  expect(() => server.didChangeConfiguration({})).not.toThrow();
  expect(() => server.didOpenTextDocument({})).not.toThrow();
  expect(() => server.didChangeTextDocument({})).not.toThrow();
  expect(() => server.didCloseTextDocument({})).not.toThrow();
  expect(() => server.didChangeWatchedFiles({})).not.toThrow();
});
