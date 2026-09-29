// Diagnostic and Rule types for the arc42 validation engine.
// Rule shape is ESLint-inspired (meta.docs, type) with our arc42-specific extensions.

import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";
import type { CoverageResult } from "../coverage.ts";
import type {
  Rule as GenericRule,
  RuleDocs as GenericRuleDocs,
  RuleMeta as GenericRuleMeta,
} from "@cli42/lib/validator";

export type { Diagnostic, RuleType, Severity } from "@cli42/lib/validator";

export interface PathEvidence {
  /** Known file/directory paths in the repository for implementation-path validation */
  knownPaths: string[];
  /** Optional repository root for resolving paths */
  root?: string;
}

/** Validation context passed to rules. */
export interface ValidationContext {
  /** Path evidence for implementation-path rules (source-neutral) */
  pathEvidence?: PathEvidence;
  /** Pre-computed coverage result for structural coverage rules */
  coverage?: CoverageResult;
  /**
   * Paths explicitly excluded from coverage scope via .arc42ignore.
   * H021 will not fire for any path that matches an entry in this set.
   */
  coverageIgnore?: Set<string>;
  /**
   * Human-readable description of the DSL fence syntax for the active notation.
   * Used by W016 to emit a notation-appropriate message.
   * Defaults to "```arc42 fence" when omitted.
   */
  fenceDescription?: string;
}

/** Which arc42 chapter this rule primarily relates to.
 * 0 = cross-cutting (applies to all chapters / document structure)
 */
export type Arc42Chapter = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Documentation metadata — the engine's rule docs plus the arc42 chapter. */
export interface RuleDocs extends GenericRuleDocs {
  /** Which arc42 chapter this rule belongs to (0=cross-cutting, 1=QualityGoals, 2=Constraints, 3=SystemScopeAndContext, 5=BuildingBlocks, 6=RuntimeView, 8=Concepts, 9=Decisions, 11=Risks, 12=Glossary) */
  arc42Chapter: Arc42Chapter;
}

/** Full rule metadata — mirrors ESLint's RulesMeta */
export type RuleMeta = GenericRuleMeta<RuleDocs>;

/** A single validation rule, run against the fully-built workspace + index. */
export type Rule = GenericRule<Workspace, ReferenceIndex, ValidationContext, RuleDocs>;
