import React, { useMemo } from "react";
import type { DocumentAst, AstNode, HeadingNode, BlockNode } from "./types";
import styles from "./Sidebar.module.css";
import { filename } from "./utils";
import { KIND_COLOR } from "./ElementCard";

interface SidebarProps {
  documents: DocumentAst[];
  activeDocIndex: number;
  onSelectDoc: (index: number) => void;
  onSelectHeading: (headingSlug: string) => void;
  viewMode: "human" | "agent";
  onToggleViewMode: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  documents,
  activeDocIndex,
  onSelectDoc,
  onSelectHeading,
  viewMode,
  onToggleViewMode,
  theme,
  onToggleTheme,
  open,
  onClose,
}: SidebarProps) {
  const activeDoc = documents[activeDocIndex];

  // Per-heading block kinds for the active document (for expanded heading list)
  const blockKindsByHeading = useMemo(
    () => (activeDoc ? computeBlockKindsByHeading(activeDoc) : new Map()),
    [activeDoc],
  );

  return (
    <nav
      className={[styles.sidebar, open ? styles.sidebarOpen : ""].filter(Boolean).join(" ")}
      aria-label="Document navigation"
    >
      <div className={styles.header}>
        <span className={styles.logo}>arc42</span>
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Close document navigation"
          onClick={onClose}
        >
          ×
        </button>
        <button
          data-testid="view-toggle"
          className={[styles.viewToggle, viewMode === "agent" ? styles.viewToggleAgent : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={onToggleViewMode}
          title={viewMode === "human" ? "Switch to Agent view (raw DSL)" : "Switch to Human view"}
          aria-pressed={viewMode === "agent"}
        >
          {viewMode === "human" ? "Human" : "Agent"}
        </button>
        <button
          data-testid="theme-toggle"
          className={styles.viewToggle}
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>

      <ul className={styles.docs} role="list">
        {documents.map((doc, i) => {
          const isActive = i === activeDocIndex;
          return (
            <li key={doc.filePath} className={styles.doc}>
              <a
                data-testid="sidebar-doc-link"
                aria-current={isActive ? "page" : undefined}
                href={`#${filename(doc.filePath)}`}
                className={[styles.docBtn, isActive ? styles.docBtnActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectDoc(i);
                }}
              >
                <span className={styles.docLabel}>{chapterLabel(doc)}</span>
              </a>

              {isActive && activeDoc && (
                <ul className={styles.headings} role="list">
                  {getDocHeadings(activeDoc)
                    .filter((h) => h.level > 1)
                    .map((h, j) => {
                      const slug = headingAnchor(h.text);
                      const headingKinds = blockKindsByHeading.get(slug) ?? [];
                      return (
                        <li
                          key={j}
                          className={styles.heading}
                          style={{ paddingLeft: `${(h.level - 2) * 12}px` }}
                        >
                          <a
                            data-testid="sidebar-heading-link"
                            href={`#${filename(doc.filePath)}:${slug}`}
                            className={styles.headingLink}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectHeading(slug);
                            }}
                          >
                            <span className={styles.headingText}>{h.text}</span>
                            {headingKinds.length > 0 && (
                              <span className={styles.headingDots} aria-hidden="true">
                                {headingKinds.map((kind: string) => (
                                  <span
                                    key={kind}
                                    className={styles.blockDot}
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

function chapterLabel(doc: DocumentAst): string {
  const heading = getDocHeadings(doc)
    .find((h) => h.level === 1)
    ?.text.trim();
  const chapter = doc.filePath.match(/(?:^|\/)0*(\d+)-/)?.[1];
  if (chapter && heading) return `${Number(chapter)}. ${heading}`;
  return heading ?? filename(doc.filePath);
}

function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Collect the unique arc42 block types directly belonging to each heading. */
function computeBlockKindsByHeading(doc: DocumentAst): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let currentHeadingSlug: string | null = null;

  for (const node of doc.nodes) {
    if (node.kind === "heading") {
      const h = node as HeadingNode;
      currentHeadingSlug = headingAnchor(h.text);
      if (!result.has(currentHeadingSlug)) result.set(currentHeadingSlug, []);
    } else if (
      node.kind === "block" &&
      (node as BlockNode).inArc42Fence &&
      currentHeadingSlug !== null
    ) {
      const kinds = result.get(currentHeadingSlug)!;
      const kind = (node as BlockNode).blockType;
      if (!kinds.includes(kind)) kinds.push(kind);
    }
  }

  return result;
}
