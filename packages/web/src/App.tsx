import React, { useMemo, useEffect, useState } from "react";
import {
  DocumentRoutes,
  WorkspaceLinks,
  changesHref,
  formatRoute,
  historyHref,
  openVersion,
  parseRoute,
  pearlKey,
  slug,
  versionHref,
} from "@cli42/lib/web";
import type { HistorySource, Route } from "@cli42/lib/web";
import {
  ChangesView,
  HistoryChain,
  HistoryEntryView,
  WebViewProvider,
  useHistory,
  useTheme,
} from "@cli42/lib/web-react";
import type { WebView } from "@cli42/lib/web-react";
import type { DiffDocument, DiffPayload, WorkspacePayload, Element } from "./types";
import { Sidebar } from "./Sidebar";
import { DocumentView, NodesRender, isArc42Block } from "./DocumentView";
import type { NodesWorkspace } from "./DocumentView";
import { CoverageView } from "./CoverageView";
import { MetaModelView } from "./MetaModelView";
import { arc42ChangeExtensions } from "./changeExtensions";
import { filename } from "./utils";
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
  /** The commit of the earlier version shown instead of the current one, if any. */
  version?: string | null;
}

// ─── Routing ──────────────────────────────────────────────────────────────────
//
// The routes of every *42 web view (@cli42/lib/web), plus arc42's own view:
//   #<file>[:el-<id>|:<heading>]   a chapter     #changes   the difference
//   #history[:<commit>[:message]]  the history   #meta-model
//   ?version=<commit>              an earlier version as a whole

const APP_VIEWS = ["meta-model"] as const;

function currentRoute(): Route {
  return parseRoute(window.location.hash, { views: APP_VIEWS });
}

/** The route, following the hash. */
function useRoute(): Route {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App({
  payload,
  diff = null,
  diffError = null,
  history = null,
  refreshToken = 0,
  version = null,
}: AppProps) {
  const route = useRoute();
  const [viewMode, setViewMode] = useState<"human" | "agent">("human");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const routes = useMemo(
    () => new DocumentRoutes(payload.documents.map((d) => d.filePath)),
    [payload.documents],
  );
  const links = useMemo(() => new WorkspaceLinks(routes, payload.elements), [routes, payload]);

  // The active document: the route's, else the one shown before (other views), else the first.
  const [lastDocument, setLastDocument] = useState(0);
  const routedIndex =
    route.view === "document" && route.file
      ? payload.documents.findIndex((d) => d.filePath === routes.resolve(route.file))
      : -1;
  const activeDocIndex =
    route.view === "document"
      ? Math.max(routedIndex, 0)
      : Math.min(lastDocument, payload.documents.length - 1);
  useEffect(() => {
    if (route.view === "document") setLastDocument(activeDocIndex);
  }, [route, activeDocIndex]);

  // Element anchors open the element's card; other anchors scroll to a heading.
  const [targetElementId, setTargetElementId] = useState<string | null>(null);
  useEffect(() => {
    if (route.view !== "document") return;
    if (route.element) {
      setTargetElementId(route.element);
    } else if (route.anchor) {
      const anchor = route.anchor;
      requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [route]);

  function navigate(next: Route) {
    window.location.hash = formatRoute(next);
    setSidebarOpen(false);
  }

  function navigateToDoc(index: number) {
    const doc = payload.documents[index];
    if (doc) window.location.hash = routes.documentHref(doc.filePath);
  }

  function navigateToHeading(headingSlug: string) {
    const doc = payload.documents[activeDocIndex];
    if (doc) window.location.hash = routes.documentHref(doc.filePath, headingSlug);
  }

  const showMetaModel = route.view === "app" && route.name === "meta-model";

  // Changes view — #changes, and the landing page whenever a difference is shown
  const hasDiff = diff !== null || diffError !== null;
  const showChanges =
    route.view === "changes" ||
    (hasDiff && route.view === "document" && route.file === "" && route.anchor === null);

  const changedDocuments = useMemo(
    () =>
      new Map<string, DiffDocument>(
        diff?.view.documents.map((d) => [routes.keyOf(d.file), d]) ?? [],
      ),
    [diff, routes],
  );

  // History — #history, #history:<commit|worktree>[:message]
  const showHistory = history !== null && route.view === "history";
  const historyKey = route.view === "history" ? route.key : undefined;
  const historyMessage = route.view === "history" && route.message;
  const historyData = useHistory<DiffPayload>(history, refreshToken);
  const pearls = historyData.state.status === "ready" ? historyData.state.pearls : [];

  // Entering the history without a selection opens the newest pearl.
  useEffect(() => {
    if (showHistory && historyKey === null && pearls[0]) {
      window.history.replaceState(null, "", historyHref(pearlKey(pearls[0])));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }, [showHistory, historyKey, pearls]);

  /** Open a pearl's version; with `message`, its commit message too. */
  function selectPearl(key: string, message = false) {
    window.location.hash = historyHref(key, message);
  }

  const selectedPearl = pearls.find((pearl) => pearlKey(pearl) === historyKey);
  const versionPearl = version ? pearls.find((pearl) => pearl.commit === version) : undefined;

  /** Open the history; from an earlier version, back in the current one at that pearl. */
  function selectHistory() {
    if (version) openVersion(null, historyHref(version));
    else window.location.hash = historyHref();
  }

  // Summary links of a visualized difference lead into the chapters: to the
  // element card when the element exists after the change, else to its chapter.
  const diffElementFiles = useMemo(() => {
    const files = new Map<string, { file: string; inHead: boolean }>();
    for (const document of diff?.view.documents ?? []) {
      for (const segment of document.segments) {
        for (const change of segment.elements) {
          const location = change.head ?? change.base;
          if (location) files.set(change.id, { file: location.file, inHead: !!change.head });
        }
      }
    }
    return files;
  }, [diff]);
  function diffElementLink(elementId: string) {
    const changed = diffElementFiles.get(elementId);
    if (changed) {
      return {
        href: changed.inHead
          ? routes.elementHref(changed.file, elementId)
          : routes.documentHref(changed.file),
      };
    }
    const href = links.elementHref(elementId);
    return href ? { href } : null;
  }

  function navigateToChapter(chapter: number) {
    const index = payload.documents.findIndex((d) =>
      filename(d.filePath).startsWith(String(chapter).padStart(2, "0")),
    );
    if (index >= 0) navigateToDoc(index);
  }

  const elementsMap = useMemo(() => {
    const map = new Map<string, Element>();
    for (const el of payload.elements) map.set(el.id, el);
    return map;
  }, [payload.elements]);

  const workspace = useMemo<NodesWorkspace>(
    () => ({ elementsMap, links, edges: payload.edges }),
    [elementsMap, links, payload.edges],
  );
  const webView = useMemo<WebView>(
    () => ({
      labels: { model: "architecture" },
      isBlock: isArc42Block,
      renderNodes: (props) => <NodesRender {...props} workspace={workspace} />,
    }),
    [workspace],
  );

  const activeDoc = payload.documents[activeDocIndex];
  const activeDiff =
    activeDoc && hasDiff ? changedDocuments.get(routes.keyOf(activeDoc.filePath)) : undefined;

  // Headings of the active chapter that the visualized difference changed.
  const activeChangedHeadings = useMemo(() => {
    if (!activeDiff) return undefined;
    return new Map(
      activeDiff.outline
        .filter((entry) => entry.status === "added" || entry.status === "modified")
        .map((entry) => [slug(entry.title), entry.status]),
    );
  }, [activeDiff]);
  const isChapter05 = activeDoc ? filename(activeDoc.filePath).startsWith("05") : false;

  return (
    <WebViewProvider value={webView}>
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
          routes={routes}
          activeDocIndex={activeDocIndex}
          onSelectDoc={navigateToDoc}
          onSelectHeading={navigateToHeading}
          onSelectMetaModel={() => navigate({ view: "app", name: "meta-model" })}
          showMetaModel={showMetaModel}
          changedHeadings={activeChangedHeadings}
          changes={
            hasDiff
              ? {
                  active: showChanges,
                  onSelect: () => navigate({ view: "changes" }),
                  documents: changedDocuments,
                }
              : undefined
          }
          history={
            history
              ? {
                  active: showHistory,
                  onSelect: selectHistory,
                  onSelectDocuments: () => {
                    window.location.hash = hasDiff
                      ? changesHref
                      : routes.documentHref(payload.documents[activeDocIndex]?.filePath ?? "");
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
          {version && (
            <p className={styles.versionBanner} role="status" data-testid="version-banner">
              <span>
                Earlier version <code>{version.slice(0, 8)}</code>
                {versionPearl && (
                  <>
                    {" "}
                    · {versionPearl.subject} · {versionPearl.date.slice(0, 10)}
                  </>
                )}
              </span>
              <a
                href={versionHref(null)}
                data-testid="version-leave"
                onClick={(event) => {
                  event.preventDefault();
                  openVersion(null);
                }}
              >
                Back to the current version
              </a>
            </p>
          )}
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
              elementHref={(id) => links.elementHref(id)}
              messageOpen={historyMessage}
              onToggleMessage={() => historyKey && selectPearl(historyKey, !historyMessage)}
              onBrowse={(commit) => openVersion(commit)}
              extensions={arc42ChangeExtensions}
            />
          ) : showChanges ? (
            <ChangesView
              diff={diff}
              error={diffError}
              viewMode={viewMode}
              elementLink={diffElementLink}
              documentLink={(file) => ({ href: routes.documentHref(file) })}
              extensions={arc42ChangeExtensions}
            />
          ) : (
            <>
              <DocumentView
                document={activeDoc}
                viewMode={viewMode}
                elementsMap={elementsMap}
                links={links}
                edges={payload.edges}
                targetElementId={targetElementId}
                onTargetConsumed={() => setTargetElementId(null)}
                diffDocument={activeDiff}
              />
              {isChapter05 && payload.coverage && (
                <CoverageView coverage={payload.coverage} links={links} />
              )}
            </>
          )}
        </main>
      </div>
    </WebViewProvider>
  );
}
