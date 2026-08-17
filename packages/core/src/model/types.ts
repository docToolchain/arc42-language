// Meta-model element types

import type { BlockType } from "../ast.ts";

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
 *   5 — Building Blocks (includes interfaces)
 *   8 — Cross-cutting Concepts
 *   9 — Architecture Decisions
 */
export const ELEMENT_KIND_ORDER: readonly BlockType[] = [
  "quality-goal",    // arc42 ch. 1
  "building-block",  // arc42 ch. 5
  "interface",       // arc42 ch. 5
  "concept",         // arc42 ch. 8
  "decision",        // arc42 ch. 9
] as const;

/** arc42 chapter each element kind belongs to */
export const ELEMENT_CHAPTER: Readonly<Record<BlockType, number>> = {
  "quality-goal":   1,
  "building-block": 5,
  "interface":      5,
  "concept":        8,
  "decision":       9,
};

/** Human-readable arc42 chapter titles */
export const CHAPTER_TITLE: Readonly<Record<number, string>> = {
  1: "Quality Goals",
  5: "Building Blocks",
  8: "Cross-cutting Concepts",
  9: "Architecture Decisions",
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
  loc: SourceLocation;
}

export type Element =
  | QualityGoal
  | BuildingBlock
  | Interface
  | Concept
  | Decision;

export interface ParseError {
  message: string;
  file: string;
  line: number;
}

export interface Workspace {
  elements: Element[];
  parseErrors: ParseError[];
}
