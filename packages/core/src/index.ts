// Core barrel export
export {
  validateDocuments,
  getElementsFromDocuments,
  parseArchitectureDocument,
  loadWorkspaceFromDocuments,
  processArchitecture,
  processArchitectureAsync,
  validateDocumentsAsync,
} from "./arc42.ts";
export { analyzeArchitectureDiff } from "./diff.ts";

export type { ValidateResult, GetDocumentsOptions } from "./arc42.ts";
export type { PathEvidence, ValidationContext } from "./validator/types.ts";
export type { AnalyzeDiffOptions, DiffFinding, DiffResult, FileChange, LineRange } from "./diff.ts";

export type { Diagnostic, Severity } from "./validator/types.ts";

export type {
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

export { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, CHAPTER_TITLE } from "./model/types.ts";

export type { ReferenceIndex, Edge } from "./resolver/types.ts";
export type {
  BlockType,
  AstNode,
  DocumentAst,
  DiagramNode,
  DiagramNodeBase,
  GenericDiagramNode,
  SequenceDiagramNode,
  DeploymentDiagramNode,
  BuildingBlockDiagramNode,
  ContextDiagramNode,
  IgnoreNode,
  BareMermaidNode,
  HeadingNode,
  ProseNode,
  BlockNode,
} from "./ast.ts";

// Rule registry
export { builtinRules, rulesByCode } from "./validator/rules/index.ts";
export type { Rule, RuleMeta, RuleDocs, RuleType, Arc42Chapter } from "./validator/types.ts";

// Renderer registry
export type {
  GetQuery,
  GetResult,
  WorkspaceQuery,
  ElementQuery,
  WorkspaceView,
  ElementView,
  ResolvedRef,
  GetRenderer,
  RendererMeta,
  ElementRenderers,
} from "./renderer/types.ts";
export type { WorkspacePayload, CoverageResult, CoveredPath } from "./workspace.ts";
export type {
  MermaidNotation,
  MermaidParseFailure,
  MermaidParseRequest,
  MermaidParseResult,
  MermaidParseSuccess,
  MermaidSyntaxParser,
} from "@arc42/mermaid";

// explain command API
export {
  explainElement,
  explainDiagram,
  formatExplainText,
  formatExplainListText,
  formatExplainDiagramText,
  formatExplainDiagramListText,
  type DiagramType,
} from "./explain.ts";
export type {
  ExplainResult,
  ExplainSummary,
  ExplainFieldResult,
  ExplainCrossRefResult,
} from "./explain.ts";

// Coverage — computeCoverage is used by workspace-fs; types are re-exported from renderer/types
export { computeCoverage } from "./coverage.ts";
