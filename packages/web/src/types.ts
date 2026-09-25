// Browser-side type re-exports from @arc42/core/types, extended with web-only virtual types.
// No hand-maintained mirrors — all shared types come directly from the core package.

export type {
  // AST types
  AstNode as CoreAstNode,
  DocumentAst,
  HeadingNode,
  ProseNode,
  BlockNode,
  BlockType,
  DiagramNode,
  DiagramNodeBase,
  GenericDiagramNode,
  SequenceDiagramNode,
  DeploymentDiagramNode,
  BuildingBlockDiagramNode,
  ContextDiagramNode,
  BareMermaidNode,
  IgnoreNode,
  // Model types
  Element,
  QualityGoal,
  QualityScenario,
  Actor,
  SolutionStrategy,
  Constraint,
  BuildingBlock,
  Interface,
  RuntimeScenario,
  DeploymentNode,
  Diagram,
  GenericDiagram,
  SequenceDiagram,
  DeploymentDiagram,
  BuildingBlockDiagram,
  ContextDiagram,
  DiagramArtifact,
  Concept,
  Decision,
  Risk,
  GlossaryTerm,
  Workspace,
  ParseError,
  IgnoreDirective,
  SourceLocation,
  // Edge / reference types
  Edge,
  ReferenceIndex,
  // Workspace payload
  WorkspacePayload,
  CoverageResult,
  CoveredPath,
  // Notation
  Notation,
  // Architecture diff
  AttributeChange,
  DiffDocument,
  DiffFinding,
  DiffPayload,
  DiffSegment,
  SectionContent,
} from "@arc42/core/types";

/** Virtual node type created by DocumentView grouping — never from the server */
export interface ProseRunNode {
  kind: "prose-run";
  text: string;
  /** Pre-rendered HTML from ProseRenderer post-parse step; undefined for legacy payloads */
  renderedHtml?: string;
  block: import("@arc42/core/types").BlockNode | null;
  ignores: import("@arc42/core/types").IgnoreNode[];
}

/**
 * Extended AstNode union that adds ProseRunNode (web-only grouping virtual node).
 * Use this in place of the core AstNode type in all SPA components.
 */
export type AstNode = import("@arc42/core/types").AstNode | ProseRunNode;
