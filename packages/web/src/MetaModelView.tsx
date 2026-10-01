/**
 * MetaModelView — arc42 meta-model element relationships diagram.
 *
 * Rendering primitives (MetaModelDiagram, autoFaces) come from @cli42/lib/web-react.
 * This file owns only arc42-specific data:
 *   - NODE_POS        → pixel positions per kind
 *   - NODE_LABEL      → display label per kind (two kinds share ch.5 and two share ch.10)
 *   - EDGE_OVERRIDES  → face/curve corrections for visually problematic edges
 *   - HIDDEN_KINDS    → kinds to skip (glossary-term has no relations)
 *   - data derivation from @arc42/core
 */

import { MetaModelDiagram, autoFaces } from "@cli42/lib/web-react";
import type { DiagramNode, DiagramEdge, Face } from "@cli42/lib/web-react";
import { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, ELEMENT_RELATIONS } from "@arc42/core";
import type { BlockType } from "@arc42/core";

// ── SVG layout constants ──────────────────────────────────────────────────────

const SVG_W = 980;
const SVG_H = 480;

/**
 * Per-kind display labels. Needed because two kinds share ch.5 ("Building Blocks")
 * and two share ch.10 ("Quality Requirements") — using CHAPTER_TITLE alone would
 * produce duplicate node labels.
 */
const NODE_LABEL: Record<BlockType, string> = {
  constraint: "Constraint",
  actor: "Actor",
  "solution-strategy": "Solution Strategy",
  "building-block": "Building Block",
  interface: "Interface",
  "runtime-scenario": "Runtime Scenario",
  "deployment-node": "Deployment Node",
  concept: "Concept",
  decision: "Decision",
  "quality-goal": "Quality Goal",
  "quality-scenario": "Quality Scenario",
  risk: "Risk",
  "glossary-term": "Glossary Term",
};

/**
 * Color CSS variable per kind.
 * Most map to their chapter's --c-ch{N}; interface has its own --c-interface token.
 */
function nodeColor(kind: BlockType): string {
  if (kind === "interface") return "var(--c-interface)";
  const ch = ELEMENT_CHAPTER[kind];
  return `var(--c-ch${ch})`;
}

const NODE_POS: Record<BlockType, [number, number]> = {
  constraint: [82, 190],
  actor: [82, 295],
  "solution-strategy": [160, 80],
  "quality-goal": [330, 80],
  "quality-scenario": [330, 190],
  concept: [497, 80],
  "building-block": [497, 270],
  interface: [497, 390],
  "runtime-scenario": [680, 190],
  "deployment-node": [680, 390],
  decision: [840, 190],
  risk: [840, 320],
  "glossary-term": [840, 450],
};

// ── Edge overrides ────────────────────────────────────────────────────────────

interface EdgeOverride {
  fromFace?: Face;
  toFace?: Face;
  cp?: [number, number];
  cubic?: true;
}

const EDGE_OVERRIDES: Record<string, EdgeOverride> = {
  "quality-scenario:elaborates:quality-goal": { fromFace: "top", toFace: "bottom" },
  "solution-strategy:addresses:quality-goal": { fromFace: "right", toFace: "left" },
  "actor:requires:interface": { fromFace: "right", toFace: "left", cp: [0, 70] },
  "building-block:implements:concept": { fromFace: "top", toFace: "bottom", cp: [28, 0] },
  "building-block:requires:interface": { fromFace: "bottom", toFace: "top", cp: [-56, 0] },
  "building-block:provides:interface": { fromFace: "bottom", toFace: "top", cp: [56, 0] },
  "runtime-scenario:involves:building-block": { fromFace: "left", toFace: "right" },
  "deployment-node:hosts:building-block": { fromFace: "left", toFace: "right", cp: [0, 28] },
  "decision:addresses:quality-goal": { fromFace: "left", toFace: "right", cp: [0, -60] },
  "decision:addresses:constraint": { fromFace: "left", toFace: "right", cp: [0, -100] },
};

// ── Kinds hidden from the visualization ──────────────────────────────────────

// glossary-term has no relations — hiding it avoids a floating unconnected node.
const HIDDEN_KINDS = new Set<BlockType>(["glossary-term"]);

// ── Build nodes and edges ─────────────────────────────────────────────────────

function buildNodes(): DiagramNode[] {
  return ELEMENT_KIND_ORDER.filter((kind) => !HIDDEN_KINDS.has(kind)).map((kind) => ({
    id: kind,
    label: NODE_LABEL[kind],
    x: NODE_POS[kind][0],
    y: NODE_POS[kind][1],
    color: nodeColor(kind),
    chapter: ELEMENT_CHAPTER[kind],
  }));
}

function buildEdges(): DiagramEdge[] {
  const edges: DiagramEdge[] = [];

  for (const { from: kind, to, relation } of ELEMENT_RELATIONS) {
    if (HIDDEN_KINDS.has(kind)) continue;
    for (const targetKind of to) {
      if (targetKind === kind) continue;
      if (HIDDEN_KINDS.has(targetKind)) continue;

      const fromPos = NODE_POS[kind];
      const toPos = NODE_POS[targetKind];
      if (!fromPos || !toPos) continue;

      const override = EDGE_OVERRIDES[`${kind}:${relation}:${targetKind}`];
      const [autoFrom, autoTo] = autoFaces(fromPos, toPos);

      edges.push({
        from: kind,
        to: targetKind,
        label: relation,
        fromFace: override?.fromFace ?? autoFrom,
        toFace: override?.toFace ?? autoTo,
        cp: override?.cp,
        cubic: override?.cubic,
      });
    }
  }

  return edges;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  marginBottom: "0.25rem",
  color: "var(--text)",
};

const subStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--text-muted)",
  marginBottom: "1.5rem",
};

const wrapStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--bg-card)",
  padding: "1rem",
  overflowX: "auto",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface MetaModelViewProps {
  onNavigateToChapter: (chapter: number) => void;
}

export function MetaModelView({ onNavigateToChapter }: MetaModelViewProps) {
  const nodes = buildNodes();
  const edges = buildEdges();

  return (
    <div style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1 style={headingStyle}>Meta-model</h1>
      <p style={subStyle}>
        How the 13 arc42 element kinds relate to each other. Click any node to open the
        corresponding chapter.
      </p>
      <div
        style={wrapStyle}
        role="img"
        aria-label="arc42 meta-model: element kinds and their cross-references across chapters 2 through 12"
      >
        <MetaModelDiagram
          nodes={nodes}
          edges={edges}
          width={SVG_W}
          height={SVG_H}
          onNodeClick={(id) => {
            const ch = ELEMENT_CHAPTER[id as BlockType];
            if (ch !== undefined) onNavigateToChapter(ch);
          }}
          ariaLabel="arc42 meta-model: element kinds and their cross-references across chapters 2 through 12"
        />
      </div>
    </div>
  );
}
