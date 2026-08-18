// Meta-model element types

import type { BlockType, DocumentAst } from "../ast.ts";

export interface SourceLocation {
  file: string;
  line: number;
}

/**
 * Canonical arc42 chapter order for element kinds.
 * Drives rendering order in `get` (workspace view) and all renderers.
 * Alphabetical-by-id sort is applied within each kind.
 *
 * Chapter mapping:
 *   1 — Quality Goals
 *   2 — Constraints
 *   5 — Building Blocks (includes interfaces)
 *   8 — Cross-cutting Concepts
 *   9 — Architecture Decisions
 *  11 — Risks and Technical Debt
 *  12 — Glossary
 */
export const ELEMENT_KIND_ORDER: readonly BlockType[] = [
  "quality-goal",    // arc42 ch. 1
  "constraint",      // arc42 ch. 2
  "building-block",  // arc42 ch. 5
  "interface",       // arc42 ch. 5
  "concept",         // arc42 ch. 8
  "decision",        // arc42 ch. 9
  "risk",            // arc42 ch. 11
  "glossary-term",   // arc42 ch. 12
] as const;

/** arc42 chapter each element kind belongs to */
export const ELEMENT_CHAPTER: Readonly<Record<BlockType, number>> = {
  "quality-goal":   1,
  "constraint":     2,
  "building-block": 5,
  "interface":      5,
  "concept":        8,
  "decision":       9,
  "risk":           11,
  "glossary-term":  12,
};

/** Human-readable arc42 chapter titles */
export const CHAPTER_TITLE: Readonly<Record<number, string>> = {
  1:  "Quality Goals",
  2:  "Constraints",
  5:  "Building Blocks",
  8:  "Cross-cutting Concepts",
  9:  "Architecture Decisions",
  11: "Risks and Technical Debt",
  12: "Glossary",
};

export interface QualityGoal {
  kind: "quality-goal";
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  scenario?: string;
  loc: SourceLocation;
}

export interface BuildingBlock {
  kind: "building-block";
  id: string;
  title: string;
  technology?: string;
  parent?: string;
  implements: string[];
  loc: SourceLocation;
}

export interface Interface {
  kind: "interface";
  id: string;
  title: string;
  between: [string, string];
  protocol?: string;
  loc: SourceLocation;
}

export interface Concept {
  kind: "concept";
  id: string;
  title: string;
  category?: string;
  loc: SourceLocation;
}

export interface Decision {
  kind: "decision";
  id: string;
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  date?: string;
  addresses: string[];
  supersedes?: string;
  loc: SourceLocation;
}

export interface Constraint {
  kind: "constraint";
  id: string;
  title: string;
  category: "technical" | "organizational" | "convention";
  source?: string;
  loc: SourceLocation;
}

export interface Risk {
  kind: "risk";
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  mitigation?: string;
  loc: SourceLocation;
}

export interface GlossaryTerm {
  kind: "glossary-term";
  id: string;
  title: string;
  definition: string;
  loc: SourceLocation;
}

export type Element =
  | QualityGoal
  | Constraint
  | BuildingBlock
  | Interface
  | Concept
  | Decision
  | Risk
  | GlossaryTerm;

export interface ParseError {
  message: string;
  file: string;
  line: number;
}

export interface Workspace {
  elements: Element[];
  parseErrors: ParseError[];
  /** Raw parsed documents — used by structure-aware validation rules (W004, W005) */
  documents: DocumentAst[];
}
