import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { WorkspacePayload } from "./types";
// @ts-expect-error — CSS import; no type declaration needed at runtime
import "./styles.css";

function Root() {
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json() as Promise<WorkspacePayload>;
      })
      .then(setPayload)
      .catch((err: unknown) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <div className="load-error">
        <h1>Failed to load workspace</h1>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="load-spinner" role="status" aria-label="Loading…">
        <div className="spinner" />
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
