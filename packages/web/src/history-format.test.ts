import { describe, expect, test } from "vite-plus/test";
import {
  HISTORY_CHUNK_SIZE,
  historyChunkFile,
  historyChunkOf,
  parseJsonLines,
  toHistoryPearls,
  toJsonLines,
} from "./history-format";

const commit = (index: number) => ({
  commit: `c${index}`,
  parent: null,
  author: "Ada",
  date: "2026-09-26T00:00:00Z",
  subject: `commit ${index}`,
});

describe("toHistoryPearls", () => {
  test("numbers pearls into chunks in order", () => {
    const pearls = toHistoryPearls(
      Array.from({ length: HISTORY_CHUNK_SIZE + 1 }, (_, index) => commit(index)),
    );
    expect(pearls.slice(0, HISTORY_CHUNK_SIZE).every((pearl) => pearl.chunk === 0)).toBe(true);
    expect(pearls[HISTORY_CHUNK_SIZE]).toMatchObject({
      commit: `c${HISTORY_CHUNK_SIZE}`,
      chunk: 1,
    });
  });

  test("keeps only the pearl fields", () => {
    const [pearl] = toHistoryPearls([{ ...commit(0), body: "a long message" } as never]);
    expect(Object.keys(pearl!).sort()).toEqual([
      "author",
      "chunk",
      "commit",
      "date",
      "parent",
      "subject",
    ]);
  });
});

describe("chunk files", () => {
  test("name a chunk and read its number back", () => {
    expect(historyChunkFile(3)).toBe("chunk-3.jsonl");
    expect(historyChunkOf(historyChunkFile(3))).toBe(3);
    expect(historyChunkOf("index.jsonl")).toBeUndefined();
    expect(historyChunkOf("chunk-x.jsonl")).toBeUndefined();
  });
});

describe("JSON Lines", () => {
  test("writes one JSON document per line and reads it back", () => {
    const text = toJsonLines([{ a: 1 }, { b: "x\ny" }]);
    expect(text).toBe('{"a":1}\n{"b":"x\\ny"}\n');
    expect(parseJsonLines(`${text}\n`)).toEqual([{ a: 1 }, { b: "x\ny" }]);
  });
});
