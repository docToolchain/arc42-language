import React, { useMemo, useEffect, useState } from "react";
import type { WorkspacePayload, Element } from "./types";
import { Sidebar } from "./Sidebar";
import { DocumentView } from "./DocumentView";
import { filename } from "./utils";

interface AppProps {
  payload: WorkspacePayload;
}

// ─── Hash-based routing ───────────────────────────────────────────────────────
//
// URL scheme:
//   /#05-building-blocks.arc42.md            doc only
//   /#05-building-blocks.arc42.md:architect  doc + heading scroll
//
// The colon separates doc filename from heading slug. Neither filenames nor
// heading slugs contain colons, so splitting on the first colon is safe.

function parseHash(hash: string): { docFile: string; headingSlug: string | null } {
  if (!hash || hash === "#") return { docFile: "", headingSlug: null };
  const fragment = hash.slice(1); // strip leading #
  const colonIdx = fragment.indexOf(":");
  if (colonIdx === -1) return { docFile: fragment, headingSlug: null };
  return {
    docFile: fragment.slice(0, colonIdx),
    headingSlug: fragment.slice(colonIdx + 1) || null,
  };
}

function hashForDoc(filePath: string, headingSlug?: string): string {
  const base = "#" + filename(filePath);
  return headingSlug ? `${base}:${headingSlug}` : base;
}

function docIndexFromHash(documents: WorkspacePayload["documents"], hash: string): number {
  const { docFile } = parseHash(hash);
  if (!docFile) return 0;
  const idx = documents.findIndex((d) => filename(d.filePath) === docFile);
  return idx >= 0 ? idx : 0;
}

function useHashRouter(documents: WorkspacePayload["documents"]) {
  const [activeDocIndex, setActiveDocIndex] = useState(() =>
    docIndexFromHash(documents, window.location.hash),
  );
  // When the hash contains an element anchor (el-{id}), store the target id
  // so ProseRun components can auto-expand and scroll to the matching card.
  const [targetElementId, setTargetElementId] = useState<string | null>(() => {
    const { headingSlug } = parseHash(window.location.hash);
    return headingSlug?.startsWith("el-") ? headingSlug.slice(3) : null;
  });

  useEffect(() => {
    function onHashChange() {
      const { docFile, headingSlug } = parseHash(window.location.hash);

      // Only update doc state if the docFile part changed
      const newIdx = docFile ? documents.findIndex((d) => filename(d.filePath) === docFile) : 0;
      setActiveDocIndex(newIdx >= 0 ? newIdx : 0);

      if (headingSlug?.startsWith("el-")) {
        // Element anchor — signal ProseRun to auto-expand
        setTargetElementId(headingSlug.slice(3));
      } else {
        setTargetElementId(null);
        // Heading slug: scroll after React renders
        if (headingSlug) {
          requestAnimationFrame(() => {
            document.getElementById(headingSlug)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        }
      }
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [documents]);

  function navigateToDoc(index: number) {
    const doc = documents[index];
    if (!doc) return;
    const newHash = hashForDoc(doc.filePath);
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    } else {
      setActiveDocIndex(index);
    }
  }

  function navigateToHeading(headingSlug: string) {
    const doc = documents[activeDocIndex];
    if (!doc) return;
    window.location.hash = hashForDoc(doc.filePath, headingSlug);
    // hashchange will handle scroll
  }

  return {
    activeDocIndex,
    targetElementId,
    clearTargetElementId: () => setTargetElementId(null),
    navigateToDoc,
    navigateToHeading,
  };
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App({ payload }: AppProps) {
  const {
    activeDocIndex,
    targetElementId,
    clearTargetElementId,
    navigateToDoc,
    navigateToHeading,
  } = useHashRouter(payload.documents);
  const [viewMode, setViewMode] = useState<"human" | "agent">("human");

  const elementsMap = useMemo(() => {
    const map = new Map<string, Element>();
    for (const el of payload.elements) {
      map.set(el.id, el);
    }
    return map;
  }, [payload.elements]);

  // Maps elementId → the filename of the doc it lives in (e.g. "05-building-blocks.arc42.md").
  // Used by ElementCard to build cross-document ref chip links.
  const elementDocMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const el of payload.elements) {
      map.set(el.id, filename(el.loc.file));
    }
    return map;
  }, [payload.elements]);

  return (
    <div className="app-layout">
      <Sidebar
        documents={payload.documents}
        activeDocIndex={activeDocIndex}
        onSelectDoc={navigateToDoc}
        onSelectHeading={navigateToHeading}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === "human" ? "agent" : "human"))}
      />
      <main className="app-main">
        <DocumentView
          documents={payload.documents}
          viewMode={viewMode}
          elementsMap={elementsMap}
          elementDocMap={elementDocMap}
          edges={payload.edges}
          activeDocIndex={activeDocIndex}
          targetElementId={targetElementId}
          onTargetConsumed={clearTargetElementId}
        />
      </main>
    </div>
  );
}
