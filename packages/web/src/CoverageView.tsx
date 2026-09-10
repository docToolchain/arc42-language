import React from "react";
import type { CoverageResult } from "./types";

interface CoverageViewProps {
  coverage: CoverageResult;
  /** Maps elementId → filename of the document it lives in (e.g. "05-building-blocks.arc42.md") */
  elementDocMap: Map<string, string>;
}

function claimantHref(id: string, elementDocMap: Map<string, string>): string {
  const docFile = elementDocMap.get(id);
  return docFile ? `#${docFile}:el-${id}` : `#el-${id}`;
}

const styles = {
  section: {
    margin: "2rem 0 1rem",
  } as React.CSSProperties,
  heading: {
    fontSize: "1.5rem",
    fontWeight: 700,
    margin: "0 0 0.5rem",
  } as React.CSSProperties,
  intro: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    margin: "0 0 0.75rem",
    lineHeight: 1.6,
  } as React.CSSProperties,
  summary: {
    fontSize: "0.875rem",
    color: "var(--text-muted)",
    margin: "0 0 1.25rem",
  } as React.CSSProperties,
  group: {
    marginTop: "1.25rem",
  } as React.CSSProperties,
  groupHeading: {
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
    margin: "0 0 0.5rem",
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.875rem",
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "0.3rem 0.75rem",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-muted)",
    fontWeight: 500,
  } as React.CSSProperties,
  td: {
    padding: "0.35rem 0.75rem",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  tdLast: {
    padding: "0.35rem 0.75rem",
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  link: {
    color: "var(--accent, var(--text))",
    textDecoration: "none",
    fontSize: "0.8rem",
    fontFamily: "var(--font-mono, monospace)",
  } as React.CSSProperties,
  sharedBadge: {
    display: "inline-block",
    marginLeft: "0.5rem",
    padding: "0.1rem 0.4rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderRadius: "var(--radius)",
    background: "color-mix(in srgb, transparent 70%, orange 30%)",
    color: "var(--text-muted)",
    verticalAlign: "middle" as const,
  } as React.CSSProperties,
  uncoveredList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.4rem",
  } as React.CSSProperties,
  uncoveredCode: {
    background: "var(--bg-code)",
    padding: "0.15rem 0.45rem",
    borderRadius: "var(--radius)",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  } as React.CSSProperties,
};

export function CoverageView({ coverage, elementDocMap }: CoverageViewProps) {
  if (coverage.totalFiles === 0) return null;

  const pct = Math.round((coverage.coveredFileCount / coverage.totalFiles) * 100);

  return (
    <section style={styles.section} aria-label="Path coverage">
      <h2 style={styles.heading}>Path Coverage</h2>
      <p style={styles.intro}>
        Based on the paths of components and interfaces, the top level source paths are determined.
        If there are files within these directories that are not claimed by any of the building
        blocks and interfaces above, it's probably something forgotten to document.
      </p>
      <p style={styles.summary}>
        {coverage.coveredFileCount} of {coverage.totalFiles} files covered ({pct}%)
      </p>

      {coverage.covered.length > 0 && (
        <div style={styles.group}>
          <h3 style={styles.groupHeading}>Covered ({coverage.covered.length})</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Path</th>
                <th style={styles.th}>Claimed by</th>
              </tr>
            </thead>
            <tbody>
              {coverage.covered.map(({ path, claimedBy, overlapping }, rowIdx) => {
                const isLastRow = rowIdx === coverage.covered.length - 1;
                const cellStyle = isLastRow ? styles.tdLast : styles.td;
                return (
                  <tr
                    key={path}
                    style={
                      overlapping
                        ? { background: "color-mix(in srgb, transparent 85%, orange 15%)" }
                        : undefined
                    }
                  >
                    <td style={cellStyle}>
                      <code>{path}</code>
                      {overlapping && (
                        <span
                          style={styles.sharedBadge}
                          title="Multiple elements of the same kind claim this path"
                        >
                          shared
                        </span>
                      )}
                    </td>
                    <td style={cellStyle}>
                      {claimedBy.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && ", "}
                          <a
                            style={styles.link}
                            href={claimantHref(c.id, elementDocMap)}
                            onMouseOver={(e) =>
                              ((e.target as HTMLAnchorElement).style.textDecoration = "underline")
                            }
                            onMouseOut={(e) =>
                              ((e.target as HTMLAnchorElement).style.textDecoration = "none")
                            }
                          >
                            {c.id}
                          </a>
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {coverage.uncovered.length > 0 && (
        <div style={styles.group}>
          <h3 style={styles.groupHeading}>Uncovered ({coverage.uncovered.length})</h3>
          <ul style={styles.uncoveredList}>
            {coverage.uncovered.map((p) => (
              <li key={p}>
                <code style={styles.uncoveredCode}>{p}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
