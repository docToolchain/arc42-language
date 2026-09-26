// Path evidence of a workspace: its repository root and the paths known there.
import { access, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { gitLsFiles } from "./git-diff.ts";

async function collectPaths(dir: string, root: string): Promise<string[]> {
  const paths: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      paths.push(relative(root, path).replaceAll("\\", "/"));
      if (entry.isDirectory()) await walk(path);
    }
  }
  await walk(root);
  return paths;
}

async function findRepositoryRoot(dir: string): Promise<string> {
  let current = resolve(dir);
  while (true) {
    try {
      await access(resolve(current, ".git"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) return resolve(dir);
      current = parent;
    }
  }
}

/**
 * The repository root of `dir` (or `root`) and every path tracked there by Git,
 * or — outside a Git repository — every path below the root.
 */
export async function pathEvidence(
  dir: string,
  root?: string,
): Promise<{ root: string; knownPaths: string[] }> {
  const repositoryRoot = resolve(root ?? (await findRepositoryRoot(dir)));
  let knownPaths: string[];
  try {
    knownPaths = gitLsFiles(repositoryRoot);
  } catch {
    knownPaths = await collectPaths(dir, repositoryRoot);
  }
  return { root: repositoryRoot, knownPaths };
}
