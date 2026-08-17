// Core barrel export
export {
  validateWorkspace,
  listElements,
  showElement,
} from "./arc42.ts";

export type {
  ValidateOptions,
  ValidateResult,
  ListOptions,
  ShowResult,
} from "./arc42.ts";

export type {
  Diagnostic,
  Severity,
} from "./validator/types.ts";

export type {
  Element,
  QualityGoal,
  BuildingBlock,
  Interface,
  Concept,
  Decision,
  Workspace,
  ParseError,
  SourceLocation,
} from "./model/types.ts";

export type { ReferenceIndex } from "./resolver/types.ts";
export type { BlockType, AstNode, DocumentAst } from "./ast.ts";

// Rule registry
export { builtinRules, rulesByCode } from "./validator/rules/index.ts";
export type {
  Rule,
  RuleMeta,
  RuleDocs,
  RuleType,
  Arc42Chapter,
} from "./validator/types.ts";
