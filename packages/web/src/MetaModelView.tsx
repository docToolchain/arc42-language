/**
 * MetaModelView — SVG of the arc42 meta-model element relationships.
 *
 * What comes from core (single source of truth):
 *   - ELEMENT_KIND_ORDER  → node render order + valid BlockType set
 *   - ELEMENT_CHAPTER     → chapter number per kind
 *   - explainElement()    → edges: connections and their field names
 *
 * What lives here (pure rendering concerns):
 *   - NODE_POS            → x/y pixel positions per kind
 *   - NODE_LABEL          → display label per kind (needed because ch.5 and ch.10
 *                           each have two kinds that would otherwise share the same title)
 *   - SVG sizing constants
 *   - EDGE_OVERRIDES      → face/curve overrides for edges where autoFaces() picks
 *                           a bad attachment or parallel arrows need a bezier nudge
 *                           (keyed "{fromKind}:{field}:{resolvedToKind}")
 *   - SKIP_TARGET_KINDS   → compound targetKind strings that are too visually
 *                           ambiguous to draw (explicit skip-list)
 *
 * Node labels are clickable and navigate to the corresponding chapter doc.
 */

import { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, explainElement } from "@arc42/core";
import type { BlockType } from "@arc42/core";

// ── SVG layout constants ──────────────────────────────────────────────────────

const NW = 136; // node box width
const NH = 28; // node box height
const RX = 5; // corner radius
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

/** Pixel centre [x, y] of each node box — pure layout, no semantic content.
 *
 * Layout philosophy: left-to-right dependency flow, chapter order roughly
 * respected. solution-strategy is the starting point (top-left); arrows
 * generally flow rightward and downward toward their dependants.
 *
 * risk and glossary-term have no outgoing crossRefs and are not targets of
 * any crossRef from the schemas. risk is a target of decision.addresses
 * (compound). glossary-term is genuinely isolated in the meta-model.
 *
 * Columns (centre x):
 *   col1  x=82   constraint, actor
 *   col2  x=160  solution-strategy
 *   col3  x=330  quality-goal, quality-scenario
 *   col4  x=497  concept, building-block, interface  (concept same column, above)
 *   col5  x=680  runtime-scenario, deployment-node
 *   col6  x=840  decision
 *   col7  x=840  risk (below decision), glossary-term (bottom-right)
 *
 * Rows (centre y): 80, 190, 295, 390, 450
 */
const NODE_POS: Record<BlockType, [number, number]> = {
  // col1 — context inputs
  constraint: [82, 190],
  actor: [82, 295],

  // col2 — strategy
  "solution-strategy": [160, 80],

  // col3 — quality goals / scenarios
  "quality-goal": [330, 80],
  "quality-scenario": [330, 190],

  // col4 — concepts + building blocks + interfaces (same column)
  concept: [497, 80],
  "building-block": [497, 270],
  interface: [497, 390],

  // col5 — runtime and deployment views
  "runtime-scenario": [680, 190],
  "deployment-node": [680, 390],

  // col6/7 — decisions + risk (col6), glossary (bottom-right)
  decision: [840, 190],
  risk: [840, 320],
  "glossary-term": [840, 450],
};

// ── Edge overrides ────────────────────────────────────────────────────────────
//
// Most edges are fully auto-derived from NODE_POS (faces) and crossRefs (label).
// This table covers exceptions where autoFaces() picks a bad face pair or
// parallel arrows need a bezier nudge to avoid overlap.
//
// Key: "{fromKind}:{field}:{resolvedToKind}"
// All fields are optional; omitted fields fall back to auto-computed values.
//
// cp:        quadratic bezier control-point offset [dx,dy] from the straight midpoint
// fromFace:  override the exit face on the source node
// toFace:    override the entry face on the target node
// cubic:     use a cubic S-curve bezier (needed when fromFace and toFace share an axis)

type Face = "right" | "left" | "top" | "bottom";

interface EdgeOverride {
  fromFace?: Face;
  toFace?: Face;
  cp?: [number, number];
  cubic?: true;
}

const EDGE_OVERRIDES: Record<string, EdgeOverride> = {
  // quality-goal → quality-scenario: vertically stacked, straight down
  "quality-goal:scenario:quality-scenario": { fromFace: "bottom", toFace: "top" },
  // quality-scenario → quality-goal: reverse; nudge left so the two arrows don't overlap
  "quality-scenario:quality:quality-goal": {
    fromFace: "left",
    toFace: "left",
    cp: [-36, 0],
    cubic: true,
  },

  // solution-strategy → quality-goal: same row, straight right
  "solution-strategy:addresses:quality-goal": { fromFace: "right", toFace: "left" },

  // actor → interface: long diagonal down-right; curve to clear building-block
  "actor:requires:interface": { fromFace: "right", toFace: "left", cp: [0, 70] },

  // building-block → concept: go straight up (same column)
  "building-block:implements:concept": { fromFace: "top", toFace: "bottom", cp: [28, 0] },

  // building-block → interface: straight down, nudge left
  "building-block:requires:interface": { fromFace: "bottom", toFace: "top", cp: [-28, 0] },

  // interface → building-block: straight up, nudge right to separate from ↕ pair
  "interface:provider:building-block": { fromFace: "top", toFace: "bottom", cp: [28, 0] },

  // runtime-scenario → building-block: go left
  "runtime-scenario:involves:building-block": { fromFace: "left", toFace: "right" },

  // deployment-node → building-block: same row, go left; arc down slightly to clear interface label
  "deployment-node:hosts:building-block": { fromFace: "left", toFace: "right", cp: [0, 28] },

  // decision → quality-goal: long arc up-left (spans cols 6→3)
  "decision:addresses:quality-goal": { fromFace: "left", toFace: "right", cp: [0, -60] },

  // decision → constraint: very long arc up-left (spans cols 6→1), swing high
  "decision:addresses:constraint": { fromFace: "left", toFace: "right", cp: [0, -100] },

  // decision → risk: same column — autoFaces() handles this, no override needed
  // (listed here for documentation; will be a no-op)
};

// ── Compound targetKind resolution ───────────────────────────────────────────
//
// crossRef.targetKind can be a compound string like "quality-goal, constraint, or risk".
// We parse it by splitting on " or " and ", " separators and validating each
// token against ELEMENT_KIND_ORDER — no manual mapping needed.
//
// Some compound strings reference too many targets. We skip them explicitly.

const SKIP_TARGET_KINDS = new Set<string>([
  // No entries needed currently.
]);

// ── Kinds hidden from the visualization ──────────────────────────────────────
//
// glossary-term has no crossRefs in either direction — genuinely isolated in
// the meta-model; hiding it avoids a floating unconnected node.

const HIDDEN_KINDS = new Set<BlockType>(["glossary-term"]);

const VALID_KINDS = new Set<string>(ELEMENT_KIND_ORDER);

/**
 * Split a crossRef targetKind string into resolved BlockType[].
 * Parses compound strings like "quality-goal, constraint, or risk" →
 * ["quality-goal", "constraint", "risk"].
 * Returns [] for any targetKind in SKIP_TARGET_KINDS.
 * Tokens not in ELEMENT_KIND_ORDER are silently filtered (defensive).
 */
function resolveTargets(targetKind: string): BlockType[] {
  if (SKIP_TARGET_KINDS.has(targetKind)) return [];
  return targetKind
    .split(/,\s+or\s+|,\s*|\s+or\s+/)
    .map((t) => t.trim())
    .filter((t) => VALID_KINDS.has(t)) as BlockType[];
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Top-left x of a node centred at cx */
function lx(cx: number) {
  return cx - NW / 2;
}
/** Top y of a node centred at cy */
function ty(cy: number) {
  return cy - NH / 2;
}

/**
 * Auto-select attachment faces from the relative position of two nodes.
 * Prefers horizontal; falls back to vertical when nodes share a column.
 */
function autoFaces([ax, ay]: [number, number], [bx, by]: [number, number]): [Face, Face] {
  const dx = bx - ax;
  const dy = by - ay;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ["right", "left"] : ["left", "right"];
  }
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}

function attachPoint([cx, cy]: [number, number], face: Face): [number, number] {
  switch (face) {
    case "right":
      return [lx(cx) + NW, cy];
    case "left":
      return [lx(cx), cy];
    case "top":
      return [cx, ty(cy)];
    case "bottom":
      return [cx, ty(cy) + NH];
  }
}

/**
 * Resolved geometry for a bezier edge: endpoints + optional control points.
 * Shared by buildPath() and labelMidpoint() to eliminate duplicated arithmetic.
 */
interface EdgeGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // quadratic control point
  qx?: number;
  qy?: number;
  // cubic control points
  cx1?: number;
  cy1?: number;
  cx2?: number;
  cy2?: number;
}

function resolveGeometry(
  from: [number, number],
  to: [number, number],
  fromFace: Face,
  toFace: Face,
  cp?: [number, number],
  cubic?: true,
): EdgeGeometry {
  const [x1, y1] = attachPoint(from, fromFace);
  const [x2, y2] = attachPoint(to, toFace);
  if (!cp) return { x1, y1, x2, y2 };
  if (cubic) {
    return {
      x1,
      y1,
      x2,
      y2,
      cx1: x1 + cp[0],
      cy1: y1 + cp[1],
      cx2: x2 - cp[0],
      cy2: y2 - cp[1],
    };
  }
  return {
    x1,
    y1,
    x2,
    y2,
    qx: (x1 + x2) / 2 + cp[0],
    qy: (y1 + y2) / 2 + cp[1],
  };
}

function buildPath(g: EdgeGeometry): string {
  if (g.cx1 !== undefined) {
    return `M ${g.x1} ${g.y1} C ${g.cx1} ${g.cy1} ${g.cx2} ${g.cy2} ${g.x2} ${g.y2}`;
  }
  if (g.qx !== undefined) {
    return `M ${g.x1} ${g.y1} Q ${g.qx} ${g.qy} ${g.x2} ${g.y2}`;
  }
  return `M ${g.x1} ${g.y1} L ${g.x2} ${g.y2}`;
}

function labelMidpoint(g: EdgeGeometry): [number, number] {
  if (g.cx1 !== undefined) {
    // t=0.5 on cubic bezier: (1/8)P0 + (3/8)P1 + (3/8)P2 + (1/8)P3
    return [
      0.125 * g.x1 + 0.375 * g.cx1! + 0.375 * g.cx2! + 0.125 * g.x2,
      0.125 * g.y1 + 0.375 * g.cy1! + 0.375 * g.cy2! + 0.125 * g.y2,
    ];
  }
  if (g.qx !== undefined) {
    // t=0.5 on quadratic bezier: (1/4)P0 + (1/2)P1 + (1/4)P2
    return [0.25 * g.x1 + 0.5 * g.qx + 0.25 * g.x2, 0.25 * g.y1 + 0.5 * g.qy! + 0.25 * g.y2];
  }
  return [(g.x1 + g.x2) / 2, (g.y1 + g.y2) / 2];
}

// ── Build edges from core crossRefs ───────────────────────────────────────────

interface RenderedEdge {
  path: string;
  label: string;
  labelX: number;
  labelY: number;
}

function buildEdges(): RenderedEdge[] {
  const rendered: RenderedEdge[] = [];

  for (const kind of ELEMENT_KIND_ORDER) {
    if (HIDDEN_KINDS.has(kind)) continue;
    const { crossRefs } = explainElement(kind);

    for (const ref of crossRefs) {
      for (const targetKind of resolveTargets(ref.targetKind)) {
        if (targetKind === kind) continue; // skip self-references
        if (HIDDEN_KINDS.has(targetKind)) continue; // skip hidden targets

        const fromPos = NODE_POS[kind];
        const toPos = NODE_POS[targetKind];
        if (!fromPos || !toPos) continue;

        const override = EDGE_OVERRIDES[`${kind}:${ref.field}:${targetKind}`];
        const [autoFrom, autoTo] = autoFaces(fromPos, toPos);
        const fromFace = override?.fromFace ?? autoFrom;
        const toFace = override?.toFace ?? autoTo;

        const geo = resolveGeometry(
          fromPos,
          toPos,
          fromFace,
          toFace,
          override?.cp,
          override?.cubic,
        );
        const [lmx, lmy] = labelMidpoint(geo);

        rendered.push({
          path: buildPath(geo),
          label: ref.field,
          labelX: lmx,
          labelY: lmy - 3,
        });
      }
    }
  }

  return rendered;
}

// ── Component ─────────────────────────────────────────────────────────────────

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

interface MetaModelViewProps {
  /** Navigate to the document for a given arc42 chapter number (2-12). */
  onNavigateToChapter: (chapter: number) => void;
}

export function MetaModelView({ onNavigateToChapter }: MetaModelViewProps) {
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
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ display: "block", minWidth: "620px" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker id="mm-arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0.5 L0,5.5 L7,3 z" fill="var(--text-muted)" />
            </marker>
          </defs>

          {/* Edges — drawn first so nodes appear on top */}
          {edges.map((e, i) => (
            <g key={i}>
              <path
                d={e.path}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth={1.2}
                markerEnd="url(#mm-arr)"
                opacity={0.5}
              />
              <text
                x={e.labelX}
                y={e.labelY}
                textAnchor="middle"
                fontSize={7.5}
                fill="var(--text-muted)"
                fontFamily="var(--font-mono)"
                opacity={0.85}
              >
                {e.label}
              </text>
            </g>
          ))}

          {/* Nodes — each is a clickable group navigating to its chapter */}
          {ELEMENT_KIND_ORDER.filter((kind) => !HIDDEN_KINDS.has(kind)).map((kind) => {
            const [cx, cy] = NODE_POS[kind];
            const ch = ELEMENT_CHAPTER[kind];
            const label = NODE_LABEL[kind];
            const color = nodeColor(kind);
            return (
              <g
                key={kind}
                onClick={() => onNavigateToChapter(ch)}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`Go to chapter ${ch}: ${label}`}
              >
                <rect
                  x={lx(cx)}
                  y={ty(cy)}
                  width={NW}
                  height={NH}
                  rx={RX}
                  fill={color}
                  fillOpacity={0.12}
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Invisible wider hit area for easier clicking */}
                <rect
                  x={lx(cx) - 4}
                  y={ty(cy) - 4}
                  width={NW + 8}
                  height={NH + 8}
                  rx={RX + 2}
                  fill="transparent"
                />
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10.5}
                  fontWeight={600}
                  fontFamily="var(--font-sans)"
                  fill={color}
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
