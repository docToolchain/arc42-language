import React, { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";

let mermaidCounter = 0;

/** Read the current effective theme from the data-theme attribute or system preference. */
function getEffectiveMermaidTheme(): "dark" | "default" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return "dark";
  if (attr === "light") return "default";
  // Fall back to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default";
}

interface MermaidDiagramProps {
  source: string;
  id?: string;
  /** Map of Mermaid node identifier → hash URL to navigate to on click. */
  clickableNodes?: Map<string, string>;
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

/**
 * Append Mermaid `click` directives for each entry in clickableNodes.
 * Must be called after cleanSource so there are no trailing fence markers.
 */
function applyClickDirectives(source: string, clickableNodes: Map<string, string>): string {
  // Mermaid architecture-beta has no `click ... href ...` directive grammar.
  // Keep deployment diagrams renderable; flowchart-based diagrams retain
  // their interactive node links.
  const firstMeaningfulLine = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("%%"));
  if (clickableNodes.size === 0 || firstMeaningfulLine === "architecture-beta") return source;
  const lines: string[] = [];
  for (const [nodeId, url] of clickableNodes) {
    lines.push(`click ${nodeId} href "${url}" "_self"`);
  }
  return source + "\n" + lines.join("\n");
}

/** Hook that returns the current mermaid theme and updates when data-theme changes. */
function useMermaidTheme(): "dark" | "default" {
  const [mermaidTheme, setMermaidTheme] = useState<"dark" | "default">(getEffectiveMermaidTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setMermaidTheme(getEffectiveMermaidTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Also listen for system preference changes (when no override is set)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const mqHandler = () => {
      if (!document.documentElement.getAttribute("data-theme")) {
        setMermaidTheme(getEffectiveMermaidTheme());
      }
    };
    mq.addEventListener("change", mqHandler);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", mqHandler);
    };
  }, []);

  return mermaidTheme;
}

export function MermaidDiagram({ source, id, clickableNodes }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const diagramId = useRef(`mermaid-${id ?? ++mermaidCounter}`);
  const mermaidTheme = useMermaidTheme();

  const cleanedSource = useMemo(() => {
    const clean = cleanSource(source);
    return clickableNodes && clickableNodes.size > 0
      ? applyClickDirectives(clean, clickableNodes)
      : clean;
  }, [source, clickableNodes]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    // Reset rendered state while re-rendering with new theme
    setRendered(false);
    setError(null);

    mermaid.initialize({ startOnLoad: false, theme: mermaidTheme, securityLevel: "loose" });

    async function render() {
      try {
        // Each render call needs a unique id to avoid mermaid's internal cache
        const renderId = `${diagramId.current}-${mermaidTheme}`;
        const { svg } = await mermaid.render(renderId, cleanedSource);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err) {
        // Mermaid may append its own error SVG before rejecting. Remove that
        // generated element so the React error state remains the sole error
        // presentation instead of showing a duplicate Mermaid placeholder.
        containerRef.current?.querySelector(`#${CSS.escape(diagramId.current)}`)?.remove();
        containerRef.current?.replaceChildren();
        if (!cancelled) {
          setError(String(err));
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [cleanedSource, mermaidTheme]);

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
      <div data-testid="diagram" ref={containerRef} className="diagram-svg" />
      {!rendered && <div className="diagram-spinner" aria-label="Rendering diagram…" />}
    </figure>
  );
}
