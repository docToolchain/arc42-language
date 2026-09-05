import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });

let mermaidCounter = 0;

interface MermaidDiagramProps {
  source: string;
  id?: string;
}

export function MermaidDiagram({ source, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const diagramId = useRef(`mermaid-${id ?? ++mermaidCounter}`);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function render() {
      try {
        const { svg } = await mermaid.render(diagramId.current, source);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return (
      <figure className="diagram-figure diagram-error">
        <pre className="diagram-raw">{source}</pre>
        <figcaption className="diagram-error-msg">Diagram render error: {error}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={`diagram-figure${rendered ? "" : " diagram-loading"}`}>
      <div ref={containerRef} className="diagram-svg" />
      {!rendered && <div className="diagram-spinner" aria-label="Rendering diagram…" />}
    </figure>
  );
}
