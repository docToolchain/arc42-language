import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import type { FileChange, LineRange } from "@arc42/core";

export interface GitArchitectureDiff {
  root: string;
  base: string;
  acceptanceBase?: string;
  changes: FileChange[];
  currentDocuments: Map<string, string>;
  baseDocuments: Map<string, string>;
  knownPaths: Set<string>;
  patch: string;
}

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

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed: git ${args.join(" ")}\n${detail}`);
  }
}

function indexMatchesHead(root: string): boolean {
  try {
    execFileSync("git", ["-C", root, "diff", "--cached", "--quiet"]);
    return true;
  } catch {
    return false;
  }
}

function range(start: number, count: number): LineRange {
  return { start, end: count === 0 ? start - 1 : start + count - 1 };
}

function parseHunks(patch: string): FileChange[] {
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

function stagedFiles(root: string): string[] {
  return git(root, ["ls-files", "-z"]).split("\0").filter(Boolean);
}

function baseFiles(root: string, base: string): string[] {
  return git(root, ["ls-tree", "-r", "-z", "--name-only", base]).split("\0").filter(Boolean);
}

function gitContents(root: string, spec: string, filePath: string): string | undefined {
  try {
    return git(root, ["show", spec === ":" ? `:${filePath}` : `${spec}:${filePath}`]);
  } catch {
    return undefined;
  }
}

export function collectGitDiff(
  root: string,
  reference?: string,
  staged = false,
): GitArchitectureDiff {
  const resolvedRoot = git(root, ["rev-parse", "--show-toplevel"]).trim();
  const workspaceRelative = relative(resolvedRoot, realpathSync(resolve(root)));
  const inWorkspace = (filePath: string) =>
    workspaceRelative === "" ||
    filePath === workspaceRelative ||
    filePath.startsWith(`${workspaceRelative}/`);
  const base = git(resolvedRoot, ["rev-parse", reference ?? "HEAD"]).trim();
  const acceptanceBase = reference || staged || indexMatchesHead(resolvedRoot) ? base : undefined;
  const patchArgs = ["diff", ...(staged ? ["--cached"] : []), "--unified=0", "--no-renames"];
  if (reference) patchArgs.push(reference);
  patchArgs.push("--");
  const patch = git(resolvedRoot, patchArgs);
  const changes = parseHunks(patch);
  const currentDocuments = new Map<string, string>();
  const currentPaths = stagedFiles(resolvedRoot);
  for (const filePath of currentPaths.filter(
    (file) => file.endsWith(".arc42.md") && inWorkspace(file),
  )) {
    let content: string | undefined;
    try {
      content = staged
        ? gitContents(resolvedRoot, ":", filePath)
        : readFileSync(join(resolvedRoot, filePath), "utf8");
    } catch {
      content = undefined;
    }
    if (content !== undefined) currentDocuments.set(filePath, content);
  }
  const baseDocuments = new Map<string, string>();
  const basePaths = reference
    ? baseFiles(resolvedRoot, base)
    : staged
      ? baseFiles(resolvedRoot, base)
      : currentPaths;
  for (const filePath of basePaths.filter(
    (file) => file.endsWith(".arc42.md") && inWorkspace(file),
  )) {
    const content = gitContents(resolvedRoot, reference ? base : staged ? base : ":", filePath);
    if (content !== undefined) baseDocuments.set(filePath, content);
  }
  const knownPaths = new Set([...stagedFiles(resolvedRoot), ...baseFiles(resolvedRoot, base)]);
  return {
    root: resolvedRoot,
    base,
    acceptanceBase,
    changes,
    currentDocuments,
    baseDocuments,
    knownPaths,
    patch,
  };
}

export function changedHunkFiles(changes: FileChange[]): Set<string> {
  return new Set(changes.map((change) => change.filePath));
}
