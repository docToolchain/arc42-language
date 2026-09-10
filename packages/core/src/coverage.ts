import type { Element } from "./model/types.ts";
import { normalizedPathSegments } from "./path-utils.ts";

// ---------------------------------------------------------------------------
// Coverage types
// ---------------------------------------------------------------------------

/**
 * A display entry in the coverage result.
 *
 * The covered list is collapsed: sub-paths are omitted when a parent directory
 * claim already covers them, UNLESS they have an overlap annotation.
 */
export interface CoveredPath {
  /** The path, e.g. "packages/core" or "packages/core/src/index.ts" */
  path: string;
  /**
   * The leaf owners of this path: the most specific elements that claim it,
   * each carrying their kind so the display can distinguish building-blocks
   * from interfaces.
   */
  claimedBy: Array<{ id: string; path: string; kind: "building-block" | "interface" }>;
  /**
   * True when multiple elements of the **same kind** make exact-match claims
   * at the **same depth** for this path:
   *   - Two or more building-blocks with identical `path` values (competing ownership)
   *   - Two or more interfaces pointing to the same file (duplicate contracts)
   *
   * Mixed-kind overlap (bb directory + interface file inside it) is NOT flagged —
   * that is the expected pattern for exposing an interface from a building-block.
   * Ancestor-only claims (a bb claims a parent dir, the entry is a child) are
   * also NOT flagged — this is normal hierarchical ownership.
   */
  overlapping: boolean;
}

/** Result of a coverage computation over a workspace + tracked path inventory. */
export interface CoverageResult {
  /**
   * Display entries — covered paths after collapsing sub-paths under a covered parent.
   * Overlap entries are always shown even when a parent covers them.
   */
  covered: CoveredPath[];
  /**
   * Uncovered top-level domain entries. Sub-paths of an uncovered directory are
   * also uncovered but are not listed individually.
   */
  uncovered: string[];
  /** Total number of tracked leaf files in the coverage domain scope */
  totalFiles: number;
  /** Number of leaf files covered by at least one element path */
  coveredFileCount: number;
  /** Number of leaf files not covered by any element path */
  uncoveredFileCount: number;
}

// ---------------------------------------------------------------------------
// Pure computation helpers
// ---------------------------------------------------------------------------

function isDirectoryClaim(elementPath: string, candidate: string): boolean {
  return candidate === elementPath || candidate.startsWith(elementPath + "/");
}

function immediateChild(parentDir: string, filePath: string): string | undefined {
  const prefix = parentDir + "/";
  if (!filePath.startsWith(prefix)) return undefined;
  const rest = filePath.slice(prefix.length);
  const slashIdx = rest.indexOf("/");
  const childName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
  return prefix + childName;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Compute path coverage for a workspace.
 *
 * @param elements      All workspace elements. Only building-blocks and interfaces
 *                      with a `path` field participate.
 * @param trackedPaths  All leaf file paths from the repository inventory (git ls-files).
 *
 * Coverage domain:
 *   For each unique parent directory that contains at least one element path,
 *   collect all immediate children (first-level files and subdirs) from
 *   trackedPaths that live under that parent.
 *
 * Overlap semantics:
 *   A domain entry is `overlapping` only when multiple elements of the *same kind*
 *   make exact-match claims at the same depth. Mixed-kind claims (bb covers a dir,
 *   interface points to a file inside it) are expected and NOT flagged.
 */
export function computeCoverage(elements: Element[], trackedPaths: string[]): CoverageResult {
  // 1. Collect element paths with kind, normalized for consistent matching
  const elementPaths: Array<{ id: string; path: string; kind: "building-block" | "interface" }> =
    [];
  for (const el of elements) {
    if (el.kind !== "building-block" && el.kind !== "interface") continue;
    const rawPath = (el as { path?: string }).path;
    if (!rawPath) continue;
    const path = normalizedPathSegments(rawPath).join("/");
    if (!path) continue;
    elementPaths.push({ id: el.id, path, kind: el.kind });
  }

  const empty: CoverageResult = {
    covered: [],
    uncovered: [],
    totalFiles: 0,
    coveredFileCount: 0,
    uncoveredFileCount: 0,
  };

  if (elementPaths.length === 0) return empty;

  // 2. Collect unique parent directories of element paths
  const parentDirs = new Set<string>();
  for (const { path } of elementPaths) {
    const slashIdx = path.lastIndexOf("/");
    parentDirs.add(slashIdx > 0 ? path.slice(0, slashIdx) : "");
  }

  const dedupedTrackedPaths = [...new Set(trackedPaths)];

  // Build domain: deduplicated immediate children of each parent dir
  const domainSet = new Set<string>();
  for (const parentDir of parentDirs) {
    if (parentDir === "") {
      for (const filePath of dedupedTrackedPaths) {
        const slashIdx = filePath.indexOf("/");
        const child = slashIdx === -1 ? filePath : filePath.slice(0, slashIdx);
        if (child) domainSet.add(child);
      }
    } else {
      for (const filePath of dedupedTrackedPaths) {
        const child = immediateChild(parentDir, filePath);
        if (child) domainSet.add(child);
      }
    }
  }

  const domain = [...domainSet].sort();
  if (domain.length === 0) return empty;

  // 3. For each domain entry, find claimants and detect overlap
  interface DomainEntry {
    path: string;
    claimedBy: Array<{ id: string; path: string; kind: "building-block" | "interface" }>;
    overlapping: boolean;
    isCovered: boolean;
  }

  const domainEntries: DomainEntry[] = [];
  for (const domainPath of domain) {
    const claimants = elementPaths.filter(({ path }) => isDirectoryClaim(path, domainPath));
    const isCovered = claimants.length > 0;

    // Overlapping = multiple same-kind elements with EXACT-MATCH claims for this path.
    // Ancestor claims (element path is a proper prefix of domainPath) are excluded —
    // they represent normal hierarchical ownership, not competing claims.
    const exactClaimants = claimants.filter(({ path }) => path === domainPath);
    const bbExact = exactClaimants.filter((c) => c.kind === "building-block");
    const ifExact = exactClaimants.filter((c) => c.kind === "interface");
    const overlapping = bbExact.length > 1 || ifExact.length > 1;

    domainEntries.push({ path: domainPath, claimedBy: claimants, overlapping, isCovered });
  }

  // 4. Build display lists (collapsed)
  //
  // Suppress a covered entry from the display if:
  //   - A parent domain entry is also covered (the parent already represents it), AND
  //   - The entry is NOT overlapping (overlaps are always shown so the smell is visible)
  //
  // Suppress an uncovered entry if an ancestor domain entry is also uncovered.

  function hasAncestorInDomain(path: string, entrySet: string[]): boolean {
    return entrySet.some((ancestor) => ancestor !== path && isDirectoryClaim(ancestor, path));
  }

  const coveredDomainPaths = domainEntries.filter((e) => e.isCovered).map((e) => e.path);
  const uncoveredDomainPaths = domainEntries.filter((e) => !e.isCovered).map((e) => e.path);

  const coveredDisplay: CoveredPath[] = [];
  for (const entry of domainEntries) {
    if (!entry.isCovered) continue;
    const parentAlreadyCovered = hasAncestorInDomain(entry.path, coveredDomainPaths);
    if (parentAlreadyCovered && !entry.overlapping) continue; // suppress
    coveredDisplay.push({
      path: entry.path,
      claimedBy: entry.claimedBy,
      overlapping: entry.overlapping,
    });
  }

  const uncoveredDisplay: string[] = [];
  for (const entry of domainEntries) {
    if (entry.isCovered) continue;
    const parentAlreadyUncovered = hasAncestorInDomain(entry.path, uncoveredDomainPaths);
    if (parentAlreadyUncovered) continue;
    uncoveredDisplay.push(entry.path);
  }

  // 5. File-level metric
  const inScope = (fp: string) => domain.some((d) => isDirectoryClaim(d, fp));
  const isCoveredFile = (fp: string) => elementPaths.some(({ path }) => isDirectoryClaim(path, fp));

  let totalFiles = 0;
  let coveredFileCount = 0;
  for (const fp of dedupedTrackedPaths) {
    if (!inScope(fp)) continue;
    totalFiles++;
    if (isCoveredFile(fp)) coveredFileCount++;
  }

  return {
    covered: coveredDisplay,
    uncovered: uncoveredDisplay,
    totalFiles,
    coveredFileCount,
    uncoveredFileCount: totalFiles - coveredFileCount,
  };
}
