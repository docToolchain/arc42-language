/**
 * Workspace payload — the data transfer object produced by loadWorkspace() and
 * loadWorkspaceFromDocuments(). Serialised as JSON by `arc42 serve` and
 * `arc42 build`; consumed by the SPA.
 *
 * Lives here (not in renderer/types.ts) because it is not a renderer concern.
 */

import type { Element, DiagramArtifact } from "./model/types.ts";
import type { DocumentAst } from "./ast.ts";
import type { Edge } from "./resolver/types.ts";
import type { CoverageResult } from "./coverage.ts";

export type { CoverageResult, CoveredPath } from "./coverage.ts";

/**
 * Full workspace payload returned by `loadWorkspace()`.
 * Serialised as JSON by the `arc42 serve` HTTP server and consumed by the SPA.
 */
export interface WorkspacePayload {
  /** All elements, in canonical kind order */
  elements: Element[];
  /** All reference edges in the workspace */
  edges: Edge[];
  /** All diagram artifacts (with raw Mermaid source) */
  diagrams: DiagramArtifact[];
  /** All parsed documents (AST) — source of truth for the human view */
  documents: DocumentAst[];
  /**
   * Pre-computed path coverage result.
   * Populated by `loadWorkspace()` in @arc42/workspace-fs from the repository inventory.
   * Optional because `loadWorkspaceFromDocuments` (pure, no filesystem) does not populate it.
   * The SPA renders this directly without recomputing.
   */
  coverage?: CoverageResult;
}
