import type { Element } from "./model/types.ts";
import { computeCoverage } from "./coverage.ts";
import type { WorkspacePayload } from "./workspace.ts";
import { diffWorkspaces } from "./workspace-diff.ts";
import type { ArchitectureDiff, ElementChange } from "./workspace-diff.ts";

export interface LineRange {
  start: number;
  end: number;
}

export interface FileChange {
  filePath: string;
  oldRanges: LineRange[];
  newRanges: LineRange[];
}

export interface DiffFinding {
  kind:
    | "block-without-prose-change"
    | "prose-without-block-change"
    | "implementation-path"
    | "new-building-block-hint";
  severity: "warning" | "hint";
  file: string;
  line: number;
  message: string;
  elementId?: string;
}

export interface DiffResult {
  /** The semantic diff the consistency findings are derived from. */
  architecture: ArchitectureDiff;
  consistencyFindings: DiffFinding[];
  pathFindings: DiffFinding[];
  coverageFindings: DiffFinding[];
  hasBlockingFindings: boolean;
}

export interface LintDiffOptions {
  /** Changed line ranges of all changed repository files (code and documents). */
  changes: FileChange[];
  base: WorkspacePayload;
  head: WorkspacePayload;
  /** Tracked paths for the base snapshot. */
  baseKnownPaths?: Set<string>;
  /** Tracked paths for the head snapshot. */
  headKnownPaths?: Set<string>;
}

function consistencyFinding(change: ElementChange): DiffFinding | undefined {
  if (change.status === "unchanged") {
    return {
      kind: "prose-without-block-change",
      severity: "warning",
      file: change.head!.file,
      line: change.head!.line,
      elementId: change.id,
      message: `Section prose changed without changing block '${change.id}'.`,
    };
  }
  if (change.proseChanged) return undefined;
  if (change.status === "removed") {
    return {
      kind: "block-without-prose-change",
      severity: "warning",
      file: change.base!.file,
      line: change.base!.line,
      elementId: change.id,
      message: `Block '${change.id}' was deleted without deleting its section prose.`,
    };
  }
  return {
    kind: "block-without-prose-change",
    severity: "warning",
    file: change.head!.file,
    line: change.head!.line,
    elementId: change.id,
    message: `Block '${change.id}' changed without changing its section prose.`,
  };
}

function pathParts(value: string): string[] | undefined {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes(".."))
    return undefined;
  return normalized.split("/").filter(Boolean);
}

function pathMatches(modeled: string, changedPath: string, knownPaths?: Set<string>): boolean {
  const expected = pathParts(modeled);
  const actual = pathParts(changedPath);
  if (!expected || !actual || actual.length < expected.length) return false;
  if (knownPaths) {
    const authored = expected.join("/");
    const isFile = knownPaths.has(authored);
    const isDirectory = [...knownPaths].some((candidate) => candidate.startsWith(`${authored}/`));
    if (!isFile && !isDirectory) return false;
    if (isFile && actual.length !== expected.length) return false;
  }
  return expected.every((part, index) => part === actual[index]);
}

/**
 * Architecture documents are never implementation files: the semantic diff
 * reviews them, and an interface whose path covers the documentation (e.g. a
 * documentation workspace) would otherwise be "reviewed" by every doc edit.
 */
function isArchitectureDocument(filePath: string): boolean {
  return filePath.endsWith(".arc42.md") || filePath.endsWith(".arc42.adoc");
}

function pathFindings(
  changes: FileChange[],
  elements: Element[],
  knownPaths?: Set<string>,
): DiffFinding[] {
  const result: DiffFinding[] = [];
  const seen = new Set<string>();
  const implementationChanges = changes.filter(
    (change) => !isArchitectureDocument(change.filePath),
  );
  for (const element of elements) {
    if (element.kind !== "interface" || element.path === undefined) continue;
    for (const change of implementationChanges) {
      if (!pathMatches(element.path, change.filePath, knownPaths)) continue;
      const key = `${element.id}:${change.filePath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        kind: "implementation-path",
        severity: "hint",
        file: change.filePath,
        line: change.newRanges[0]?.start ?? 1,
        elementId: element.id,
        message: `${change.filePath} changed; review architecture element '${element.id}' (${element.path}).`,
      });
    }
  }
  return result.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      (a.elementId ?? "").localeCompare(b.elementId ?? ""),
  );
}

function coverageDiffFindings(options: LintDiffOptions): DiffFinding[] {
  if (!options.headKnownPaths || options.headKnownPaths.size === 0) return [];
  const headCoverage = computeCoverage(options.head.elements, [...options.headKnownPaths]);
  const baseCoverage =
    options.baseKnownPaths && options.baseKnownPaths.size > 0
      ? computeCoverage(options.base.elements, [...options.baseKnownPaths])
      : { uncovered: [] as string[] };
  const newlyUncovered = headCoverage.uncovered.filter((p) => !baseCoverage.uncovered.includes(p));
  return newlyUncovered.sort().map((path) => ({
    kind: "new-building-block-hint" as const,
    severity: "hint" as const,
    file: path,
    line: 0,
    message: `'${path}' is not covered by any building block — consider adding a building-block element.`,
  }));
}

/**
 * Lint a change to the architecture: derive consistency findings (block and
 * prose changed together) from the semantic diff of both snapshots, and
 * advisory hints for changed implementation paths and newly uncovered code.
 */
export function lintArchitectureDiff(options: LintDiffOptions): DiffResult {
  const architecture = diffWorkspaces(options.base, options.head);
  const consistency = architecture.elements
    .map(consistencyFinding)
    .filter((finding): finding is DiffFinding => finding !== undefined)
    .sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind),
    );
  const knownPaths =
    options.headKnownPaths || options.baseKnownPaths
      ? new Set([...(options.headKnownPaths ?? []), ...(options.baseKnownPaths ?? [])])
      : undefined;
  return {
    architecture,
    consistencyFindings: consistency,
    pathFindings: pathFindings(
      options.changes,
      [...options.head.elements, ...options.base.elements],
      knownPaths,
    ),
    coverageFindings: coverageDiffFindings(options),
    hasBlockingFindings: consistency.length > 0,
  };
}
