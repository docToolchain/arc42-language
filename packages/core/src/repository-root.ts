import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { Workspace } from "./model/types.ts";

export interface RepositoryRootOptions {
  dir: string;
  root?: string;
}

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function gitRoot(dir: string): string | undefined {
  try {
    return (
      execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

function pathExistsUnder(root: string, value: string): boolean {
  if (isAbsolute(value)) return false;
  const candidate = resolve(root, value);
  if (!inside(root, candidate) || !existsSync(candidate)) return false;

  // Existing symlinks are checked by their real target as well, so a link cannot
  // make validation silently inspect an unrelated tree.
  try {
    return inside(realpathSync(root), realpathSync(candidate));
  } catch {
    return false;
  }
}

export function firstAuthoredPath(workspace: Workspace): string | undefined {
  for (const element of workspace.elements) {
    if ((element.kind === "building-block" || element.kind === "interface") && element.path) {
      return element.path;
    }
  }
  return undefined;
}

/** Resolve one root strategy for the whole validation run. */
export function resolveRepositoryRoot(
  workspace: Workspace,
  options: RepositoryRootOptions,
): string {
  const explicit = options.root ? resolve(options.root) : undefined;
  if (explicit) {
    if (!existsSync(explicit) || !lstatSync(explicit).isDirectory()) {
      throw new Error(`Repository root is not a directory: ${explicit}`);
    }
    return realpathSync(explicit);
  }

  const dir = resolve(options.dir);
  const candidates = [gitRoot(dir), dir, resolve(process.cwd())]
    .filter((value): value is string => Boolean(value))
    .map((value) => resolve(value));
  const path = firstAuthoredPath(workspace);
  const selected = path
    ? candidates.find((candidate) => pathExistsUnder(candidate, path))
    : undefined;
  return realpathSync(selected ?? candidates[0] ?? resolve(process.cwd()));
}

export function resolveAuthoredPath(root: string, value: string): string | undefined {
  if (value.trim() === "" || isAbsolute(value)) return undefined;
  const candidate = resolve(root, value);
  if (!inside(root, candidate) || !existsSync(candidate)) return undefined;
  try {
    return inside(realpathSync(root), realpathSync(candidate)) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function normalizedPath(root: string, value: string): string[] | undefined {
  const resolved = resolveAuthoredPath(root, value);
  if (!resolved) return undefined;
  return relative(root, resolved).split(sep).filter(Boolean);
}
