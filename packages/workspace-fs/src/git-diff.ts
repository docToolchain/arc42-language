import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { relative, resolve } from "node:path";

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

/**
 * Returns all git-tracked file paths relative to `root`.
 * Throws if `root` is not inside a git repository.
 */
export function gitLsFiles(root: string): string[] {
  return git(root, ["ls-files", "-z"]).split("\0").filter(Boolean);
}

/** The repository of a workspace directory and a test for paths inside the workspace. */
export function workspaceLocation(dir: string): {
  root: string;
  inWorkspace: (path: string) => boolean;
} {
  const root = git(resolve(dir), ["rev-parse", "--show-toplevel"]).trim();
  const workspace = relative(root, realpathSync(resolve(dir))).replaceAll("\\", "/");
  return {
    root,
    inWorkspace: (path) =>
      workspace === "" || path === workspace || path.startsWith(`${workspace}/`),
  };
}
