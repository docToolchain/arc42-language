import React, { useMemo, useState, useEffect } from "react";
import { marked } from "marked";
import type { AstNode, BlockNode, DiagramNode, ProseRunNode, Element, Edge } from "./types";
import { ElementCard } from "./ElementCard";
import { MermaidDiagram } from "./MermaidDiagram";
import { AgentBlock } from "./AgentBlock";
import { KIND_COLOR } from "./ElementCard";

interface AstNodeRendererProps {
  node: AstNode;
  viewMode: "human" | "agent";
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
  edges: Edge[];
  autoExpandElementId?: string | null;
  onAutoExpanded?: () => void;
}

export function AstNodeRenderer({
  node,
  viewMode,
  elementsMap,
  elementDocMap,
  edges,
  autoExpandElementId,
  onAutoExpanded,
}: AstNodeRendererProps) {
  switch (node.kind) {
    case "heading": {
      const Tag = `h${Math.min(node.level, 6)}` as keyof React.JSX.IntrinsicElements;
      const anchor = node.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <Tag id={anchor} className={`doc-heading doc-heading--${node.level}`}>
          {node.text}
        </Tag>
      );
    }

    case "prose": {
      // Plain prose — used only when node wasn't merged into a prose-run.
      return <ProseBlock text={node.text} />;
    }

    case "prose-run": {
      const runNode = node as ProseRunNode;
      return (
        <ProseRun
          text={runNode.text}
          block={runNode.block}
          viewMode={viewMode}
          elementsMap={elementsMap}
          elementDocMap={elementDocMap}
          edges={edges}
          autoExpand={!!autoExpandElementId}
          onAutoExpanded={onAutoExpanded}
        />
      );
    }

    case "block": {
      const blockNode = node as BlockNode;
      if (!blockNode.inArc42Fence) {
        return (
          <pre className="code-block">
            <code>{reconstructBlockSource(blockNode)}</code>
          </pre>
        );
      }
      // arc42 block without preceding prose (shouldn't happen often but handle gracefully)
      if (viewMode === "human") {
        return (
          <ElementCard
            elementId={blockNode.attributes["id"] ?? ""}
            elementsMap={elementsMap}
            elementDocMap={elementDocMap}
            edges={edges}
          />
        );
      }
      return <AgentBlock source={reconstructArc42FenceSource(blockNode)} lang="arc42" />;
    }

    case "diagram": {
      const diagramNode = node as DiagramNode;
      if (viewMode === "human") {
        return <MermaidDiagram source={diagramNode.source} id={diagramNode.id} />;
      }
      return <AgentBlock source={diagramNode.source} lang="mermaid" />;
    }

    case "bare-mermaid": {
      // Bare mermaid block — no :::diagram metadata. Render anyway; validator warns.
      const source = (node as { kind: "bare-mermaid"; source: string }).source;
      if (viewMode === "human") {
        return <MermaidDiagram source={source} id={`bare-${node.startLine}`} />;
      }
      return <AgentBlock source={source} lang="mermaid" />;
    }

    default:
      return null;
  }
}

// ─── Prose + toggling element card ───────────────────────────────────────────

interface ProseRunProps {
  text: string;
  block: BlockNode | null;
  viewMode: "human" | "agent";
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
  edges: Edge[];
  autoExpand?: boolean;
  onAutoExpanded?: () => void;
}

function ProseRun({
  text,
  block,
  viewMode,
  elementsMap,
  elementDocMap,
  edges,
  autoExpand,
  onAutoExpanded,
}: ProseRunProps) {
  const [showCard, setShowCard] = useState(false);

  // Auto-expand when targetElementId matches this block — e.g. when navigating
  // via a cross-document ref chip link (#doc:el-some-id).
  useEffect(() => {
    if (autoExpand && block !== null) {
      setShowCard(true);
      onAutoExpanded?.();
      // Scroll to the card after React renders it
      const elementId = block.attributes["id"] ?? "";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(`el-${elementId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    }
  }, [autoExpand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine the stripe colour from the attached block's element kind
  const stripeColor = useMemo(() => {
    if (!block) return null;
    const elementId = block.attributes["id"] ?? "";
    const el = elementsMap.get(elementId);
    if (!el) return null;
    return KIND_COLOR[el.kind] ?? null;
  }, [block, elementsMap]);

  const hasBlock = block !== null;

  if (!hasBlock || viewMode === "agent") {
    return (
      <div className="prose-run">
        {text && <ProseBlock text={text} />}
        {hasBlock && viewMode === "agent" && (
          <AgentBlock source={reconstructArc42FenceSource(block!)} lang="arc42" />
        )}
      </div>
    );
  }

  // Human view: stripe toggles between prose and element card
  const color = stripeColor ?? "var(--c-ch0)";

  if (showCard) {
    // Card mode: full-width, no outer stripe — the card's left border IS the stripe.
    // Clicking anywhere on the card's left border (the button overlay) dismisses back to prose.
    return (
      <div className="prose-run prose-run--card-expanded">
        <div className="prose-run__card-view">
          <ElementCard
            elementId={block.attributes["id"] ?? ""}
            elementsMap={elementsMap}
            elementDocMap={elementDocMap}
            edges={edges}
            accentColor={color}
            onDismiss={() => setShowCard(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="prose-run prose-run--has-block">
      <button
        data-testid="prose-stripe"
        className="prose-run__stripe"
        style={{ backgroundColor: color }}
        onClick={() => setShowCard(true)}
        title="Show element details"
        aria-expanded={false}
      />
      <div className="prose-run__content">
        <div className="prose-run__prose-view">{text && <ProseBlock text={text} />}</div>
      </div>
    </div>
  );
}

// ─── Prose renderer ──────────────────────────────────────────────────────────

interface ProseBlockProps {
  text: string;
}

function ProseBlock({ text }: ProseBlockProps) {
  const html = useMemo(() => {
    try {
      return marked.parse(text, { async: false }) as string;
    } catch {
      return `<p>${text}</p>`;
    }
  }, [text]);
  return <div className="prose-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Source reconstruction helpers ───────────────────────────────────────────

function reconstructBlockSource(node: BlockNode): string {
  const lines: string[] = [`:::${node.blockType}`];
  for (const [key, val] of Object.entries(node.attributes)) {
    lines.push(`${key}: ${val}`);
  }
  lines.push(":::");
  return lines.join("\n");
}

function reconstructArc42FenceSource(node: BlockNode): string {
  const lines: string[] = [`:::${node.blockType}`];
  for (const [key, val] of Object.entries(node.attributes)) {
    lines.push(`${key}: ${val}`);
  }
  lines.push(":::");
  return lines.join("\n");
}
