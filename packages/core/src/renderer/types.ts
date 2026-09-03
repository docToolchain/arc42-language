/**
 * Renderer types for the arc42 workspace.
 *
 * Design principles:
 * - `WorkspaceRenderer.render()` is the only public contract — all formats
 *   must implement this and nothing else.
 * - `ElementRenderers` is an internal pattern for text/json/html that
 *   decompose rendering by element kind. Graph-level formats (graphviz)
 *   are NOT required to use it; they implement `WorkspaceRenderer` directly.
 * - `GetQuery` captures what `arc42 get` asked for — workspace view or
 *   single element. Renderers use this to decide compact vs. full-detail output.
 */

import type {
  Element,
  QualityGoal,
  QualityScenario,
  Actor,
  SolutionStrategy,
  Constraint,
  BuildingBlock,
  Interface,
  Concept,
  Decision,
  Risk,
  GlossaryTerm,
  RuntimeScenario,
  DeploymentNode,
} from "../model/types.ts";
import type { BlockType } from "../ast.ts";

// ---------------------------------------------------------------------------
// Query context — passed to renderers so they know what was asked
// ---------------------------------------------------------------------------

/**
 * Workspace view: render all elements (optionally filtered by type),
 * grouped by arc42 chapter, sorted alphabetically by id within each group.
 */
export interface WorkspaceQuery {
  kind: "workspace";
  /** If set, only render elements of this type */
  typeFilter?: BlockType;
}

/**
 * Single-element view: render one element with full detail and
 * resolved 1-hop neighbors (both incoming and outgoing).
 */
export interface ElementQuery {
  kind: "element";
  id: string;
}

export type GetQuery = WorkspaceQuery | ElementQuery;

// ---------------------------------------------------------------------------
// Result types — what the core API returns for `get`
// ---------------------------------------------------------------------------

/** A graph edge connecting two elements */
export interface Edge {
  from: string;
  to: string;
  /** The semantic relationship type */
  relation: "implements" | "parent" | "between" | "addresses" | "involves" | "hosts" | "elaborates";
}

/** Result of a workspace-level get query */
export interface WorkspaceView {
  kind: "workspace";
  /** Elements in canonical order: ELEMENT_KIND_ORDER, then alpha by id */
  elements: Element[];
  /** All reference edges in the workspace */
  edges: Edge[];
  typeFilter?: BlockType;
}

/** A resolved neighbor reference — id + element (if it exists in the workspace) */
export interface ResolvedRef {
  id: string;
  element?: Element;
}

/** Result of a single-element get query */
export interface ElementView {
  kind: "element";
  element: Element;
  /** 1-hop outgoing references (what this element points to), resolved */
  refsFrom: ResolvedRef[];
  /** 1-hop incoming references (what points to this element), resolved */
  refsTo: ResolvedRef[];
}

export type GetResult = WorkspaceView | ElementView;

// ---------------------------------------------------------------------------
// Renderer interfaces
// ---------------------------------------------------------------------------

/** Metadata about a renderer — mirrors RuleMeta pattern */
export interface RendererMeta {
  /** Format id, used as --format value: "text" | "json" | "graphviz" | "html" */
  id: string;
  /** Human-readable description */
  description: string;
  /** MIME type of the output */
  mimeType: string;
}

/**
 * A renderer for `arc42 get` output.
 * Receives a pre-computed `GetResult` (workspace or single element view)
 * and returns a string in its format.
 *
 * This is the only public contract all renderers must implement.
 */
export interface GetRenderer {
  meta: RendererMeta;
  render(result: GetResult): string;
}

/**
 * Internal helper type used by text/json/html renderers that decompose
 * rendering by element kind. NOT a required interface for all renderers
 * (e.g. graphviz implements GetRenderer directly).
 */
export interface ElementRenderers {
  "quality-goal": (el: QualityGoal, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  "quality-scenario": (
    el: QualityScenario,
    refsFrom: ResolvedRef[],
    refsTo: ResolvedRef[],
  ) => string;
  actor: (el: Actor, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  "solution-strategy": (
    el: SolutionStrategy,
    refsFrom: ResolvedRef[],
    refsTo: ResolvedRef[],
  ) => string;
  constraint: (el: Constraint, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  "building-block": (el: BuildingBlock, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  interface: (el: Interface, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  concept: (el: Concept, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  decision: (el: Decision, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  risk: (el: Risk, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  "glossary-term": (el: GlossaryTerm, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
  "runtime-scenario": (
    el: RuntimeScenario,
    refsFrom: ResolvedRef[],
    refsTo: ResolvedRef[],
  ) => string;
  "deployment-node": (el: DeploymentNode, refsFrom: ResolvedRef[], refsTo: ResolvedRef[]) => string;
}
