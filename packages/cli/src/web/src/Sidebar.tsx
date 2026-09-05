import React, { useMemo } from "react";
import type { DocumentAst, AstNode, HeadingNode, BlockNode } from "./types";
import { basename, filename } from "./utils";
import { KIND_COLOR } from "./ElementCard";

interface SidebarProps {
  documents: DocumentAst[];
  activeDocIndex: number;
  onSelectDoc: (index: number) => void;
  onSelectHeading: (headingSlug: string) => void;
  viewMode: "human" | "agent";
  onToggleViewMode: () => void;
}

export function Sidebar({
  documents,
  activeDocIndex,
  onSelectDoc,
  onSelectHeading,
  viewMode,
  onToggleViewMode,
}: SidebarProps) {
  const activeDoc = documents[activeDocIndex];

  // Per-heading block kinds for the active document (for expanded heading list)
  const blockKindsByHeading = useMemo(
    () => (activeDoc ? computeBlockKindsByHeading(activeDoc) : new Map()),
    [activeDoc],
  );

  // All-document block kind aggregates (for collapsed doc rows)
  const docKinds = useMemo(() => documents.map((doc) => computeDocKinds(doc)), [documents]);

  return (
    <nav className="sidebar" aria-label="Document navigation">
      <div className="sidebar__header">
        <span className="sidebar__logo">arc42</span>
        <button
          className={`view-toggle ${viewMode === "agent" ? "view-toggle--agent" : ""}`}
          onClick={onToggleViewMode}
          title={viewMode === "human" ? "Switch to Agent view (raw DSL)" : "Switch to Human view"}
          aria-pressed={viewMode === "agent"}
        >
          {viewMode === "human" ? "Human" : "Agent"}
        </button>
      </div>

      <ul className="sidebar__docs" role="list">
        {documents.map((doc, i) => {
          const isActive = i === activeDocIndex;
          const kinds = docKinds[i] ?? [];
          return (
            <li key={doc.filePath} className="sidebar__doc">
              <a
                href={`#${filename(doc.filePath)}`}
                className={`sidebar__doc-btn ${isActive ? "sidebar__doc-btn--active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectDoc(i);
                }}
              >
                <span className="sidebar__doc-label">{basename(doc.filePath)}</span>
                {kinds.length > 0 && (
                  <span className="sidebar__heading-dots" aria-hidden="true">
                    {kinds.map((kind: string) => (
                      <span
                        key={kind}
                        className="sidebar__block-dot"
                        style={{ backgroundColor: KIND_COLOR[kind] ?? "var(--c-ch0)" }}
                        title={kind}
                      />
                    ))}
                  </span>
                )}
              </a>

              {isActive && activeDoc && (
                <ul className="sidebar__headings" role="list">
                  {getDocHeadings(activeDoc).map((h, j) => {
                    const slug = headingAnchor(h.text);
                    const headingKinds = blockKindsByHeading.get(slug) ?? [];
                    return (
                      <li
                        key={j}
                        className="sidebar__heading"
                        style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                      >
                        <a
                          href={`#${filename(doc.filePath)}:${slug}`}
                          className="sidebar__heading-link"
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectHeading(slug);
                          }}
                        >
                          <span className="sidebar__heading-text">{h.text}</span>
                          {headingKinds.length > 0 && (
                            <span className="sidebar__heading-dots" aria-hidden="true">
                              {headingKinds.map((kind: string) => (
                                <span
                                  key={kind}
                                  className="sidebar__block-dot"
                                  style={{ backgroundColor: KIND_COLOR[kind] ?? "var(--c-ch0)" }}
                                  title={kind}
                                />
                              ))}
                            </span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDocHeadings(doc: DocumentAst): HeadingNode[] {
  return doc.nodes.filter((n: AstNode): n is HeadingNode => n.kind === "heading");
}

function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * All unique arc42 block kinds in the whole document (for collapsed doc row dots).
 */
function computeDocKinds(doc: DocumentAst): string[] {
  const kinds = new Set<string>();
  for (const node of doc.nodes) {
    if (node.kind === "block" && (node as BlockNode).inArc42Fence) {
      kinds.add((node as BlockNode).blockType);
    }
  }
  return [...kinds];
}

/**
 * For each heading, collect the unique arc42 block types that appear between
 * that heading and the next heading of the same or higher level.
 */
function computeBlockKindsByHeading(doc: DocumentAst): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const nodes = doc.nodes;
  let currentHeadingSlug: string | null = null;
  let currentHeadingLevel = 0;
  const kindsInSection = new Set<string>();

  function flush() {
    if (currentHeadingSlug && kindsInSection.size > 0) {
      result.set(currentHeadingSlug, [...kindsInSection]);
    }
    kindsInSection.clear();
  }

  for (const node of nodes) {
    if (node.kind === "heading") {
      const h = node as HeadingNode;
      const slug = headingAnchor(h.text);
      if (currentHeadingSlug !== null && h.level <= currentHeadingLevel) {
        flush();
      }
      currentHeadingSlug = slug;
      currentHeadingLevel = h.level;
    } else if (
      node.kind === "block" &&
      (node as BlockNode).inArc42Fence &&
      currentHeadingSlug !== null
    ) {
      kindsInSection.add((node as BlockNode).blockType);
    }
  }
  flush();

  return result;
}
