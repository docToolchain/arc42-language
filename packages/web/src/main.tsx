import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { WorkspacePayload } from "./types";
import styles from "./App.module.css";
import "./styles.css";

function Root() {
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mode 1 (arc42 export): workspace injected inline by CLI as window.__WORKSPACE__
    // Mode 2 (arc42 serve): fetch from HTTP API
    const injected = (window as unknown as { __WORKSPACE__?: WorkspacePayload }).__WORKSPACE__;
    if (injected) {
      setPayload(injected);
      return;
    }

    let events: EventSource | undefined;
    let active = true;
    fetch("/api/workspace")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json() as Promise<WorkspacePayload>;
      })
      .then((nextPayload) => {
        if (!active) return;
        setPayload(nextPayload);
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

  return <App payload={payload} />;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No #root element found");

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
