import type { CoverageResult, CoveredPath } from "@arc42/core";

// ANSI colour codes
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";

// ---------------------------------------------------------------------------
// Tree node types
// ---------------------------------------------------------------------------

interface TreeNode {
  /** Display name (last path segment) */
  name: string;
  /** Full path */
  path: string;
  /** null = intermediate group node with no direct coverage entry */
  covered: CoveredPath | null;
  uncovered: boolean;
  children: TreeNode[];
}

// ---------------------------------------------------------------------------
// Build tree from flat covered/uncovered paths
// ---------------------------------------------------------------------------

function getOrCreate(map: Map<string, TreeNode>, path: string): TreeNode {
  if (map.has(path)) return map.get(path)!;
  const parts = path.split("/");
  const name = parts[parts.length - 1] ?? path;
  const node: TreeNode = { name, path, covered: null, uncovered: false, children: [] };
  map.set(path, node);
  return node;
}

function buildTree(covered: CoveredPath[], uncovered: string[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();

  // Ensure all ancestor nodes exist
  function ensureAncestors(path: string) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const ancestorPath = parts.slice(0, i).join("/");
      getOrCreate(nodes, ancestorPath);
    }
    return getOrCreate(nodes, path);
  }

  for (const entry of covered) {
    const node = ensureAncestors(entry.path);
    node.covered = entry;
  }

  for (const path of uncovered) {
    const node = ensureAncestors(path);
    node.uncovered = true;
  }

  // Link children to parents
  for (const [path, node] of nodes) {
    const parts = path.split("/");
    if (parts.length === 1) continue; // root-level
    const parentPath = parts.slice(0, -1).join("/");
    const parent = nodes.get(parentPath);
    if (parent && !parent.children.includes(node)) {
      parent.children.push(node);
    }
  }

  // Sort children alphabetically
  for (const node of nodes.values()) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Return root nodes (nodes with no parent in the map)
  const roots: TreeNode[] = [];
  for (const [path, node] of nodes) {
    const parts = path.split("/");
    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      if (!nodes.has(parentPath)) roots.push(node);
    }
  }

  return roots.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------------------------------------------------------------------------
// Render tree to string
// ---------------------------------------------------------------------------

function renderNode(node: TreeNode, prefix: string, isLast: boolean, lines: string[]) {
  const connector = isLast ? "└──" : "├──";
  const childPrefix = prefix + (isLast ? "    " : "│   ");

  if (node.covered) {
    const { claimedBy, overlapping } = node.covered;
    const ids = claimedBy.map((c) => c.id).join(", ");
    const overlapNote = overlapping ? ` ${DIM}[shared]${RESET}` : "";
    lines.push(
      `${prefix}${connector} ${GREEN}✓${RESET} ${node.name}  ${DIM}→ ${ids}${overlapNote}${RESET}`,
    );
  } else if (node.uncovered) {
    lines.push(`${prefix}${connector} ${RED}✗ ${node.name}${RESET}`);
  } else {
    // Intermediate group node
    lines.push(`${prefix}${connector} ${node.name}/`);
  }

  for (let i = 0; i < node.children.length; i++) {
    renderNode(node.children[i]!, childPrefix, i === node.children.length - 1, lines);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function formatCoverageTree(result: CoverageResult): string {
  const roots = buildTree(result.covered, result.uncovered);
  const lines: string[] = [];

  for (let i = 0; i < roots.length; i++) {
    renderNode(roots[i]!, "", i === roots.length - 1, lines);
  }

  const pct =
    result.totalFiles > 0 ? Math.round((result.coveredFileCount / result.totalFiles) * 100) : 0;
  lines.push("");
  lines.push(`Coverage: ${result.coveredFileCount} of ${result.totalFiles} files (${pct}%)`);

  return lines.join("\n");
}
