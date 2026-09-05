import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });

let mermaidCounter = 0;

interface MermaidDiagramProps {
  source: string;
  id?: string;
}

/**
 * Strip Markdown code fence markers from diagram source if present.
 * The parser may include the opening ``` fence line when the diagram block
 * is authored without a :::diagram metadata wrapper.
 */
function cleanSource(source: string): string {
  // The source string starts with a newline then the fence opener (e.g. "\n```mermaid\n...")
  // because the parser captures content between the :::diagram block and the closing fence.
  // Strip leading whitespace/newlines, then the optional fence opener line, then trim.
  return source
    .trimStart()
    .replace(/^```[a-zA-Z0-9_-]*[ \t]*\n/, "") // strip leading ```mermaid\n
    .replace(/\n```[ \t]*$/, "") // strip trailing \n```
    .trim();
}

export function MermaidDiagram({ source, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const diagramId = useRef(`mermaid-${id ?? ++mermaidCounter}`);
  const cleanedSource = cleanSource(source);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function render() {
      try {
        const { svg } = await mermaid.render(diagramId.current, cleanedSource);
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
  }, [cleanedSource]);

  if (error) {
    return (
      <figure className="diagram-figure diagram-error">
        <pre className="diagram-raw">{cleanedSource}</pre>
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
