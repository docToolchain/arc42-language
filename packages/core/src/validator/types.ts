// Diagnostic and Rule types for the arc42 validation engine.
// Rule shape is ESLint-inspired (meta.docs, type) with our arc42-specific extensions.

import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";

export type Severity = "error" | "warning" | "hint";

export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
}

/** Which arc42 chapter this rule primarily relates to.
 * 0 = cross-cutting (applies to all chapters / document structure)
 */
export type Arc42Chapter = 0 | 1 | 2 | 3 | 4 | 5 | 8 | 9 | 11 | 12;

/**
 * Rule type — mirrors ESLint's RuleType vocabulary:
 * - "problem"     → likely incorrect / broken (maps to error/warning)
 * - "suggestion"  → not wrong, but could be better (maps to hint)
 */
export type RuleType = "problem" | "suggestion";

/** Documentation metadata — modelled after ESLint's RulesMetaDocs */
export interface RuleDocs {
  /** One-line description, usable in `arc42 rules` output and SKILL.md */
  description: string;
  /**
   * Why this rule exists — the design reasoning behind it.
   * Shown in `arc42 rules --format text` and surfaced in the SKILL.md.
   */
  rationale: string;
  /** Which arc42 chapter this rule belongs to (0=cross-cutting, 1=QualityGoals, 2=Constraints, 3=SystemScopeAndContext, 5=BuildingBlocks, 8=Concepts, 9=Decisions, 11=Risks, 12=Glossary) */
  arc42Chapter: Arc42Chapter;
  /** Whether the rule is enabled by default in the built-in rule set */
  recommended: boolean;
  /** Optional URL to extended documentation */
  url?: string;
}

/** Full rule metadata — mirrors ESLint's RulesMeta */
export interface RuleMeta {
  /** Rule code, e.g. "E001". Never changes once assigned. */
  code: string;
  /** Default severity for this rule */
  severity: Severity;
  /** Rule type — "problem" or "suggestion" */
  type: RuleType;
  /** Human-readable docs */
  docs: RuleDocs;
}

/** A single validation rule. Inspired by ESLint's RuleDefinition. */
export interface Rule {
  meta: RuleMeta;
  /** Run this rule against the fully-built workspace + index */
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[];
}
