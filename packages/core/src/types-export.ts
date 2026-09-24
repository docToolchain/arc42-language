// Browser-safe type-only subpath export for @arc42/core.
// Import from "@arc42/core/types" in browser/SPA contexts.
// Contains ONLY export type re-exports — no runtime functions, no Node.js imports.

export type {
  // AST types
  AstNode,
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
} from "./ast.ts";

export type {
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
} from "./model/types.ts";

export type {
  // Edge / reference types
  Edge,
  ReferenceIndex,
} from "./resolver/types.ts";

export type {
  // Workspace payload
  WorkspacePayload,
  CoverageResult,
  CoveredPath,
} from "./workspace.ts";

export type {
  // Notation
  Notation,
  NotationAdapter,
} from "./notation/types.ts";
