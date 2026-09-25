import { execFileSync } from "node:child_process";

import type { FileChange, LineRange } from "@arc42/core";

function unquoteGitPath(value: string): string {
  if (!value.startsWith('"') || !value.endsWith('"')) return value;
  const source = value.slice(1, -1);
  let result = "";
  let bytes: number[] = [];
  const flushBytes = () => {
    if (bytes.length) {
      result += Buffer.from(bytes).toString("utf8");
      bytes = [];
    }
  };
  for (let index = 0; index < source.length; index++) {
    if (source[index] !== "\\") {
      flushBytes();
      result += source[index];
      continue;
    }
    const octal = source.slice(index + 1).match(/^[0-7]{1,3}/)?.[0];
    if (octal) {
      bytes.push(parseInt(octal, 8));
      index += octal.length;
      continue;
    }
    flushBytes();
    const escaped = source[index + 1] ?? "";
    result +=
      ({ a: "a", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" } as Record<string, string>)[
        escaped
      ] ?? escaped;
    index++;
  }
  flushBytes();
  return result;
}

export function parseDiffPathHeader(line: string): string | undefined {
  if (!line.startsWith("diff --git ")) return undefined;
  const values: string[] = [];
  let token = "";
  let quoted = false;
  const source = line.slice("diff --git ".length);
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "\\" && quoted) {
      token += char;
      const escaped = source[index + 1];
      if (escaped) {
        token += escaped;
        index++;
      }
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (char === " " && !quoted) {
      if (token) values.push(token);
      token = "";
    } else token += char;
  }
  if (token) values.push(token);
  const newPath = values[1] ? unquoteGitPath(values[1]) : undefined;
  return newPath?.startsWith("b/") ? newPath.slice(2) : undefined;
}

export function git(root: string, args: string[]): string {
  try {
    // Patches and file listings of real repositories easily exceed the 1 MiB default.
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 1024,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed: git ${args.join(" ")}\n${detail}`);
  }
}

function range(start: number, count: number): LineRange {
  return { start, end: count === 0 ? start - 1 : start + count - 1 };
}

export function parseHunks(patch: string): FileChange[] {
  const changes = new Map<string, FileChange>();
  let current: FileChange | undefined;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const filePath = parseDiffPathHeader(line);
      if (!filePath) continue;
      current = changes.get(filePath) ?? { filePath, oldRanges: [], newRanges: [] };
      changes.set(filePath, current);
      continue;
    }
    if (!current) continue;
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk) continue;
    current.oldRanges.push(range(Number(hunk[1]), Number(hunk[2] ?? 1)));
    current.newRanges.push(range(Number(hunk[3]), Number(hunk[4] ?? 1)));
  }
  return [...changes.values()];
}

/**
 * Returns all git-tracked file paths relative to `root`.
 * Throws if `root` is not inside a git repository.
 */
export function gitLsFiles(root: string): string[] {
  return git(root, ["ls-files", "-z"]).split("\0").filter(Boolean);
}
