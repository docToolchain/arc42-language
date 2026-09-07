/**
 * Shared Mermaid source utilities for diagram validation rules.
 */

const MERMAID_KEYWORDS = new Set([
  "graph",
  "TD",
  "TB",
  "LR",
  "RL",
  "BT",
  "subgraph",
  "end",
  "click",
  "style",
  "classDef",
  "class",
  "direction",
  "flowchart",
  "linkStyle",
  "fill",
  "stroke",
  "color",
]);

/**
 * Extract node ids from a Mermaid source string.
 * Returns ids that appear as node definitions (before `[` or `(`).
 * Skips edge lines (`-->`) and known Mermaid keywords.
 */
export function extractMermaidIds(source: string): Set<string> {
  const ids = new Set<string>();
  const nodeDefPattern = /^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*[[("(]/m;
  const lines = source.split("\n");
  for (const line of lines) {
    if (line.includes("-->")) continue;
    const nodeMatch = line.match(nodeDefPattern);
    if (nodeMatch) {
      const token = nodeMatch[1];
      if (token && !MERMAID_KEYWORDS.has(token)) {
        ids.add(token);
      }
    }
  }
  return ids;
}

/**
 * Check whether a model element id appears in a Mermaid source string.
 * Uses word-boundary matching to avoid false positives from id prefix collisions
 * (e.g. `bb-api` matching inside `bb-api-gateway`).
 */
export function sourceContainsId(source: string, id: string): boolean {
  const escaped = id.replace(/[-]/g, "\\-");
  return new RegExp(`(?<![a-zA-Z0-9_-])${escaped}(?![a-zA-Z0-9_-])`).test(source);
}

/** An edge extracted from Mermaid source, including its label. */
export interface MermaidEdge {
  from: string;
  to: string;
  /** The label content between `|"..."| ` delimiters, or undefined if no label. */
  label: string | undefined;
}

/**
 * Extract all edges from a Mermaid `graph TD` source string.
 *
 * Handles the canonical form used in arc42 diagrams:
 *   sourceId -->|"label"| targetId
 *   sourceId --> targetId  (no label)
 *
 * Also handles inline node definitions on the source side:
 *   sourceId["Label"] -->|"if-x"| targetId
 *
 * Returns `{ from, to, label }` — label is the raw string between `|"..."| `,
 * stripped of surrounding quotes. If no label is present, label is `undefined`.
 */
export function extractMermaidEdges(source: string): MermaidEdge[] {
  const edges: MermaidEdge[] = [];
  const lines = source.split("\n");

  for (const line of lines) {
    if (!line.includes("-->")) continue;

    // Strip inline node definition from source side: id["label"] or id(["label"])
    // so the id is just the leading token before [ or (
    const stripped = line.trim().replace(/^([a-zA-Z][a-zA-Z0-9_-]*)(?:\s*[[(][^\])\n]*)/, "$1");

    // Match: from -->|"label"| to   OR   from --> to
    const withLabel =
      /^([a-zA-Z][a-zA-Z0-9_-]*)\s*-->\s*\|"([^"]*)"\|\s*([a-zA-Z][a-zA-Z0-9_-]*)/.exec(stripped);
    if (withLabel) {
      const from = withLabel[1]!;
      const label = withLabel[2]!;
      const to = withLabel[3]!;
      if (!MERMAID_KEYWORDS.has(from) && !MERMAID_KEYWORDS.has(to)) {
        edges.push({ from, to, label });
      }
      continue;
    }

    const noLabel = /^([a-zA-Z][a-zA-Z0-9_-]*)\s*-->\s*([a-zA-Z][a-zA-Z0-9_-]*)/.exec(stripped);
    if (noLabel) {
      const from = noLabel[1]!;
      const to = noLabel[2]!;
      if (!MERMAID_KEYWORDS.has(from) && !MERMAID_KEYWORDS.has(to)) {
        edges.push({ from, to, label: undefined });
      }
    }
  }

  return edges;
}

/**
 * Extract subgraph ids from a Mermaid source string.
 *
 * Handles both forms:
 *   subgraph bb-core["Core Library"]
 *   subgraph bb-core
 *
 * Returns the set of ids declared as subgraphs (the token immediately after `subgraph`).
 */
export function extractMermaidSubgraphIds(source: string): Set<string> {
  const ids = new Set<string>();
  const lines = source.split("\n");
  for (const line of lines) {
    const m = /^\s*subgraph\s+([a-zA-Z][a-zA-Z0-9_-]*)/.exec(line.trim());
    if (m && m[1]) {
      ids.add(m[1]);
    }
  }
  return ids;
}
