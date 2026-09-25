import React, { useMemo, useEffect, useState } from "react";
import type { DiffDocument, DiffPayload, WorkspacePayload, Element } from "./types";
import { Sidebar } from "./Sidebar";
import { DocumentView } from "./DocumentView";
import { CoverageView } from "./CoverageView";
import { MetaModelView } from "./MetaModelView";
import { ChangesView } from "./ChangesView";
import { HistoryChain } from "./HistoryChain";
import { HistoryEntryView } from "./HistoryEntryView";
import { pearlKey, useHistory } from "./useHistory";
import type { HistorySource } from "./useHistory";
import { filename } from "./utils";
import { useTheme } from "./useTheme";
import styles from "./App.module.css";

interface AppProps {
  payload: WorkspacePayload;
  /** The visualized difference (serve/build --diff), if any. */
  diff?: DiffPayload | null;
  /** Error of a difference that could not be computed. */
  diffError?: string | null;
  /** Where to load the architecture history from, if any. */
  history?: HistorySource | null;
  /** Changes whenever the server announces new data. */
  refreshToken?: number;
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

export function App({
  payload,
  diff = null,
  diffError = null,
  history = null,
  refreshToken = 0,
}: AppProps) {
  const {
    activeDocIndex,
    targetElementId,
    clearTargetElementId,
    navigateToDoc,
    navigateToHeading,
  } = useHashRouter(payload.documents);
  const [viewMode, setViewMode] = useState<"human" | "agent">("human");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // Meta-model overlay — toggled via #meta-model hash
  const [showMetaModel, setShowMetaModel] = useState(() => window.location.hash === "#meta-model");

  useEffect(() => {
    function onHashChange() {
      setShowMetaModel(window.location.hash === "#meta-model");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function selectMetaModel() {
    window.location.hash = "meta-model";
    setSidebarOpen(false);
  }

  // Changes view — #changes, and the landing page whenever a difference is shown
  const hasDiff = diff !== null || diffError !== null;
  const isChangesHash = () =>
    window.location.hash === "#changes" ||
    (hasDiff && (window.location.hash === "" || window.location.hash === "#"));
  const [showChanges, setShowChanges] = useState(isChangesHash);

  useEffect(() => {
    setShowChanges(isChangesHash());
    function onHashChange() {
      setShowChanges(isChangesHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [hasDiff]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectChanges() {
    window.location.hash = "changes";
    setSidebarOpen(false);
  }

  const changedDocuments = useMemo(
    () =>
      new Map<string, DiffDocument>(diff?.view.documents.map((d) => [filename(d.file), d]) ?? []),
    [diff],
  );

  // History — #history, #history:<commit|worktree>
  const historyKeyFromHash = () =>
    window.location.hash.startsWith("#history")
      ? window.location.hash.slice("#history:".length) || null
      : undefined;
  const [historyKey, setHistoryKey] = useState<string | null | undefined>(historyKeyFromHash);
  useEffect(() => {
    function onHashChange() {
      setHistoryKey(historyKeyFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const showHistory = history !== null && historyKey !== undefined;
  const historyData = useHistory(history, refreshToken);
  const pearls = historyData.state.status === "ready" ? historyData.state.pearls : [];

  // Entering the history without a selection opens the newest pearl.
  useEffect(() => {
    if (showHistory && historyKey === null && pearls[0]) {
      window.history.replaceState(null, "", `#history:${pearlKey(pearls[0])}`);
      setHistoryKey(pearlKey(pearls[0]));
    }
  }, [showHistory, historyKey, pearls]);

  function selectPearl(key: string) {
    window.location.hash = `history:${key}`;
  }

  const selectedPearl = pearls.find((pearl) => pearlKey(pearl) === historyKey);

  // Summary links of a visualized difference lead into the chapters: to the
  // element card when the element exists after the change, else to its chapter.
  const diffElementFiles = useMemo(() => {
    const files = new Map<string, { file: string; inHead: boolean }>();
    for (const document of diff?.view.documents ?? []) {
      for (const segment of document.segments) {
        for (const change of segment.elements) {
          const location = change.head ?? change.base;
          if (location) {
            files.set(change.id, { file: filename(location.file), inHead: !!change.head });
          }
        }
      }
    }
    return files;
  }, [diff]);
  function diffElementLink(elementId: string) {
    const changed = diffElementFiles.get(elementId);
    if (changed) {
      return { href: changed.inHead ? `#${changed.file}:el-${elementId}` : `#${changed.file}` };
    }
    const file = elementDocMap.get(elementId);
    return file ? { href: `#${file}:el-${elementId}` } : null;
  }

  function navigateToChapter(chapter: number) {
    const doc = payload.documents.find((d) =>
      filename(d.filePath).startsWith(String(chapter).padStart(2, "0")),
    );
    if (doc) {
      const idx = payload.documents.indexOf(doc);
      navigateToDoc(idx);
    }
  }

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

  const activeDoc = payload.documents[activeDocIndex];

  // Headings of the active chapter that the visualized difference changed.
  const activeChangedHeadings = useMemo(() => {
    const outline = activeDoc
      ? changedDocuments.get(filename(activeDoc.filePath))?.outline
      : undefined;
    if (!outline) return undefined;
    return new Map(
      outline
        .filter((entry) => entry.status === "added" || entry.status === "modified")
        .map((entry) => [
          entry.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-"),
          entry.status,
        ]),
    );
  }, [activeDoc, changedDocuments]);
  const isChapter05 = activeDoc ? filename(activeDoc.filePath).startsWith("05") : false;

  return (
    <div className={styles.layout}>
      <button
        className={styles.menuButton}
        type="button"
        aria-label="Open document navigation"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(true)}
      >
        <span aria-hidden="true">☰</span>
        <span>Contents</span>
      </button>
      {sidebarOpen && (
        <button
          className={styles.sidebarBackdrop}
          type="button"
          aria-label="Close document navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        documents={payload.documents}
        activeDocIndex={activeDocIndex}
        onSelectDoc={navigateToDoc}
        onSelectHeading={navigateToHeading}
        onSelectMetaModel={selectMetaModel}
        showMetaModel={showMetaModel}
        changedHeadings={activeChangedHeadings}
        changes={
          hasDiff
            ? { active: showChanges, onSelect: selectChanges, documents: changedDocuments }
            : undefined
        }
        history={
          history
            ? {
                active: showHistory,
                onSelect: () => {
                  window.location.hash = "history";
                },
                onSelectDocuments: () => {
                  window.location.hash = hasDiff
                    ? "changes"
                    : hashForDoc(payload.documents[activeDocIndex]?.filePath ?? "");
                },
                panel: (
                  <HistoryChain
                    state={historyData.state}
                    entries={historyData.entries}
                    chunkErrors={historyData.chunkErrors}
                    requestChunk={historyData.requestChunk}
                    selectedKey={historyKey ?? null}
                    onSelect={selectPearl}
                  />
                ),
              }
            : undefined
        }
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === "human" ? "agent" : "human"))}
        theme={theme}
        onToggleTheme={toggleTheme}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className={styles.main}>
        {showMetaModel ? (
          <MetaModelView onNavigateToChapter={navigateToChapter} />
        ) : showHistory ? (
          <HistoryEntryView
            pearl={selectedPearl}
            entry={historyKey ? historyData.entries.get(historyKey) : undefined}
            chunkError={
              selectedPearl ? historyData.chunkErrors.get(selectedPearl.chunk) : undefined
            }
            requestChunk={historyData.requestChunk}
            viewMode={viewMode}
            elementDocMap={elementDocMap}
          />
        ) : showChanges ? (
          <ChangesView
            diff={diff}
            error={diffError}
            viewMode={viewMode}
            elementLink={diffElementLink}
            documentLink={(file) => ({ href: `#${filename(file)}` })}
          />
        ) : (
          <>
            <DocumentView
              documents={payload.documents}
              viewMode={viewMode}
              elementsMap={elementsMap}
              elementDocMap={elementDocMap}
              edges={payload.edges}
              activeDocIndex={activeDocIndex}
              targetElementId={targetElementId}
              onTargetConsumed={clearTargetElementId}
              diffDocuments={hasDiff ? changedDocuments : undefined}
            />
            {isChapter05 && payload.coverage && (
              <CoverageView coverage={payload.coverage} elementDocMap={elementDocMap} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
