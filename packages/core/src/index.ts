// Core barrel export
export { validateWorkspace, getElements } from "./arc42.ts";

export type { ValidateOptions, ValidateResult, GetOptions } from "./arc42.ts";

export type { Diagnostic, Severity } from "./validator/types.ts";

export type {
  Element,
  QualityGoal,
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
  DiagramArtifact,
  Concept,
  Decision,
  Risk,
  GlossaryTerm,
  Workspace,
  ParseError,
  SourceLocation,
} from "./model/types.ts";

export { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, CHAPTER_TITLE } from "./model/types.ts";

export type { ReferenceIndex } from "./resolver/types.ts";
export type {
  BlockType,
  AstNode,
  DocumentAst,
  DiagramNode,
  DiagramNodeBase,
  GenericDiagramNode,
  SequenceDiagramNode,
  DeploymentDiagramNode,
} from "./ast.ts";

// Rule registry
export { builtinRules, rulesByCode } from "./validator/rules/index.ts";
export type { Rule, RuleMeta, RuleDocs, RuleType, Arc42Chapter } from "./validator/types.ts";

// Renderer registry
export { builtinGetRenderers, rendererById } from "./renderer/index.ts";
export type {
  GetQuery,
  GetResult,
  WorkspaceQuery,
  ElementQuery,
  WorkspaceView,
  ElementView,
  Edge,
  ResolvedRef,
  GetRenderer,
  RendererMeta,
  ElementRenderers,
} from "./renderer/types.ts";

// explain command API
export { explainElement, formatExplainText, formatExplainListText } from "./explain.ts";
export type {
  ExplainResult,
  ExplainSummary,
  ExplainFieldResult,
  ExplainCrossRefResult,
} from "./explain.ts";
