import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { DiffPayload, WorkspacePayload } from "./types";
import styles from "./App.module.css";
import "./styles.css";

interface DiffState {
  diff: DiffPayload | null;
  error: string | null;
}

/**
 * Fetch the difference served by `arc42 serve --diff`. 404 means serve runs
 * without --diff; 500 carries the error of a difference that could not be computed.
 */
async function fetchDiff(): Promise<DiffState> {
  const response = await fetch("/api/diff");
  if (response.status === 404) return { diff: null, error: null };
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    return { diff: null, error: body.error ?? `Server returned ${response.status}` };
  }
  return { diff: (await response.json()) as DiffPayload, error: null };
}

function Root() {
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [diffState, setDiffState] = useState<DiffState>({ diff: null, error: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mode 1 (arc42 build): workspace — and with --diff, the difference — injected
    // inline by the CLI as window.__WORKSPACE__ / window.__DIFF__
    // Mode 2 (arc42 serve): fetch from HTTP API
    const injectedWindow = window as unknown as {
      __WORKSPACE__?: WorkspacePayload;
      __DIFF__?: DiffPayload;
    };
    const injected = injectedWindow.__WORKSPACE__;
    if (injected) {
      setPayload(injected);
      setDiffState({ diff: injectedWindow.__DIFF__ ?? null, error: null });
      return;
    }

    let events: EventSource | undefined;
    let active = true;
    fetch("/api/workspace")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json() as Promise<WorkspacePayload>;
      })
      .then(async (nextPayload) => {
        const nextDiff = await fetchDiff();
        if (!active) return;
        setPayload(nextPayload);
        setDiffState(nextDiff);
        // `serve` watches the source directory and announces successful
        // reloads over SSE. Exported workspaces do not have this endpoint.
        events = new EventSource("/api/workspace/events");
        events.addEventListener("workspace", () => {
          void fetch("/api/workspace")
            .then((r) => {
              if (!r.ok) throw new Error(`Server returned ${r.status}`);
              return r.json() as Promise<WorkspacePayload>;
            })
            .then(setPayload)
            .catch((err: unknown) => setError(String(err)));
          void fetchDiff()
            .then(setDiffState)
            .catch((err: unknown) => setDiffState({ diff: null, error: String(err) }));
        });
      })
      .catch((err: unknown) => setError(String(err)));

    return () => {
      active = false;
      events?.close();
    };
  }, []);

  if (error) {
    return (
      <div className={styles.loadError}>
        <h1>Failed to load workspace</h1>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className={styles.loadSpinner} role="status" aria-label="Loading…">
        <div className={styles.spinner} />
        <p>Loading workspace…</p>
      </div>
    );
  }

  return <App payload={payload} diff={diffState.diff} diffError={diffState.error} />;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No #root element found");

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
