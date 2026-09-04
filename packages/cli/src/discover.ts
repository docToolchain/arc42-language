import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PREFERRED_NAMES = new Set(["docs", "arc42"]);
const MAX_DEPTH = 3;

// Directories that are clearly not user workspaces — skip them entirely
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".vite",
  "__fixtures__",
  "__tests__",
]);

function hasArc42Files(dir: string): boolean {
  try {
    return readdirSync(dir, { withFileTypes: true }).some(
      (e) => e.isFile() && e.name.includes(".arc42."),
    );
  } catch {
    return false;
  }
}

/** Collect all subdirectories up to `maxDepth` levels deep that contain
 *  *.arc42.* files. Results are sorted so preferred names ("docs", "arc42")
 *  come first. Well-known non-workspace dirs (node_modules, dist, etc.) are
 *  skipped. */
function arc42SubDirs(dir: string, maxDepth = MAX_DEPTH): string[] {
  if (maxDepth <= 0) return [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as import("node:fs").Dirent[];
  } catch {
    return [];
  }

  // Sort subdirs so preferred names are visited first
  const subdirs = entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has((e.name as string).toLowerCase()))
    .sort((a, b) => {
      const aP = PREFERRED_NAMES.has((a.name as string).toLowerCase());
      const bP = PREFERRED_NAMES.has((b.name as string).toLowerCase());
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return 0;
    })
    .map((e) => join(dir, e.name as string));

  const results: string[] = [];
  for (const sub of subdirs) {
    if (hasArc42Files(sub)) {
      results.push(sub);
    }
    // Always recurse into all subdirs (not just preferred-name ones) so all
    // candidates are discovered and the multi-match warning fires correctly.
    results.push(...arc42SubDirs(sub, maxDepth - 1));
  }
  return results;
}

/** Walk up the directory tree from `start`:
 *  1. Check the current directory itself for *.arc42.* files.
 *  2. If not found there, scan subdirectories up to MAX_DEPTH levels deep.
 *     - Preferred names ("docs", "arc42") are visited first and recursed into.
 *     - If exactly one subdir matches, use it silently.
 *     - If multiple subdirs match, warn and use the first (preferred names win).
 *  3. Move to parent and repeat until the filesystem root.
 *
 *  Returns the resolved directory path, or undefined if nothing is found. */
export function discoverArc42Dir(
  start: string,
  warn: (msg: string) => void = (msg) => process.stderr.write(msg + "\n"),
): string | undefined {
  let current = resolve(start);
  while (true) {
    // 1. Current dir has arc42 files — exact match, no ambiguity
    if (hasArc42Files(current)) return current;

    // 2. Check subdirs (preferred names first, recurse into them)
    const matches = arc42SubDirs(current);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      warn(
        `warning: multiple directories with arc42 files found, using '${matches[0]}':\n` +
          matches.map((m) => `  ${m}`).join("\n") +
          "\n  Use --dir to suppress this warning.",
      );
      return matches[0];
    }

    // 3. Move up
    const parent = dirname(current);
    if (parent === current) return undefined; // reached root
    current = parent;
  }
}
