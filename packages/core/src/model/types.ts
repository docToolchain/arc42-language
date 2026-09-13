// Meta-model element types

import type { BlockType, DocumentAst } from "../ast.ts";
import { z } from "zod";
import {
  ELEMENT_SCHEMAS,
  QualityGoalSchema,
  QualityScenarioSchema,
  ActorSchema,
  SolutionStrategySchema,
  BuildingBlockSchema,
  InterfaceSchema,
  RuntimeScenarioSchema,
  DeploymentNodeSchema,
  ConceptSchema,
  DecisionSchema,
  ConstraintSchema,
  RiskSchema,
  GlossaryTermSchema,
} from "./schemas.ts";

export interface SourceLocation {
  file: string;
  line: number;
  /** The text of the nearest heading that precedes this element in its source file, if any. */
  heading?: string;
  /** Prose lines between the nearest preceding heading and this element's block, if any. */
  prose?: string;
}

/**
 * Canonical arc42 chapter order for element kinds.
 * Drives rendering order in `get` (workspace view) and all renderers.
 * Alphabetical-by-id sort is applied within each kind.
 *
 * The authoritative chapter mapping is derived at runtime in ELEMENT_CHAPTER
 * (from schema metadata). The comments here are for quick orientation only.
 */
export const ELEMENT_KIND_ORDER: readonly BlockType[] = [
  "constraint", // arc42 ch. 2
  "actor", // arc42 ch. 3
  "solution-strategy", // arc42 ch. 4
  "building-block", // arc42 ch. 5
  "interface", // arc42 ch. 5
  "runtime-scenario", // arc42 ch. 6
  "deployment-node", // arc42 ch. 7
  "concept", // arc42 ch. 8
  "decision", // arc42 ch. 9
  "quality-goal", // arc42 ch. 10
  "quality-scenario", // arc42 ch. 10
  "risk", // arc42 ch. 11
  "glossary-term", // arc42 ch. 12
] as const;

/** arc42 chapter each element kind belongs to — derived from schema metadata. */
export const ELEMENT_CHAPTER: Readonly<Record<BlockType, number>> = Object.fromEntries(
  (Object.entries(ELEMENT_SCHEMAS) as [BlockType, z.ZodType][]).map(([kind, schema]) => {
    const meta = z.globalRegistry.get(schema) as { arc42Chapter?: number } | undefined;
    if (meta?.arc42Chapter === undefined) {
      throw new Error(`Schema for '${kind}' is missing arc42Chapter in .meta()`);
    }
    return [kind, meta.arc42Chapter];
  }),
) as Readonly<Record<BlockType, number>>;

/** Human-readable arc42 chapter titles */
export const CHAPTER_TITLE: Readonly<Record<number, string>> = {
  2: "Constraints",
  3: "System Scope and Context",
  4: "Solution Strategy",
  5: "Building Blocks",
  6: "Runtime View",
  7: "Deployment View",
  8: "Cross-cutting Concepts",
  9: "Architecture Decisions",
  10: "Quality Requirements",
  11: "Risks and Technical Debt",
  12: "Glossary",
};

// ---------------------------------------------------------------------------
// Element types — derived from Zod schemas + { kind, loc }
// ---------------------------------------------------------------------------

export type QualityGoal = z.infer<typeof QualityGoalSchema> & {
  kind: "quality-goal";
  loc: SourceLocation;
};

export type QualityScenario = z.infer<typeof QualityScenarioSchema> & {
  kind: "quality-scenario";
  loc: SourceLocation;
};

export type Actor = z.infer<typeof ActorSchema> & {
  kind: "actor";
  loc: SourceLocation;
};

export type SolutionStrategy = z.infer<typeof SolutionStrategySchema> & {
  kind: "solution-strategy";
  loc: SourceLocation;
};

export type BuildingBlock = z.infer<typeof BuildingBlockSchema> & {
  kind: "building-block";
  loc: SourceLocation;
};

export type Interface = z.infer<typeof InterfaceSchema> & {
  kind: "interface";
  loc: SourceLocation;
};

export type RuntimeScenario = z.infer<typeof RuntimeScenarioSchema> & {
  kind: "runtime-scenario";
  loc: SourceLocation;
};

export type DeploymentNode = z.infer<typeof DeploymentNodeSchema> & {
  kind: "deployment-node";
  loc: SourceLocation;
};

export type Concept = z.infer<typeof ConceptSchema> & {
  kind: "concept";
  loc: SourceLocation;
};

export type Decision = z.infer<typeof DecisionSchema> & {
  kind: "decision";
  loc: SourceLocation;
};

export type Constraint = z.infer<typeof ConstraintSchema> & {
  kind: "constraint";
  loc: SourceLocation;
};

export type Risk = z.infer<typeof RiskSchema> & {
  kind: "risk";
  loc: SourceLocation;
};

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema> & {
  kind: "glossary-term";
  loc: SourceLocation;
};

export type Element =
  | QualityGoal
  | QualityScenario
  | Constraint
  | Actor
  | SolutionStrategy
  | BuildingBlock
  | Interface
  | RuntimeScenario
  | DeploymentNode
  | Concept
  | Decision
  | Risk
  | GlossaryTerm;

// ---------------------------------------------------------------------------
// Diagram types — not derived from schemas (carry kind, diagramType, source, loc)
// ---------------------------------------------------------------------------

/** Abstract diagram artifact shared by all notation adapters. */
export interface Diagram {
  kind: "diagram";
  id: string;
  notation: string;
  /** Raw, untrusted fenced source; never interpreted by the model itself. */
  source: string;
  /** Raw aliases string; the owning notation rule owns key-value parsing and diagnostics. */
  aliases: string;
  loc: SourceLocation;
}

export interface GenericDiagram extends Diagram {
  diagramType: "generic";
}

/** Sequence diagrams are the Runtime View-specific diagram subtype. */
export interface SequenceDiagram extends Diagram {
  diagramType: "sequence";
  notation: "mermaid-sequence";
  scenario: string;
}

export interface DeploymentDiagram extends Diagram {
  diagramType: "deployment";
  view: "deployment";
  roots: string[];
}

export interface BuildingBlockDiagram extends Diagram {
  diagramType: "building-block";
  view: "building-block";
  roots: string[];
}

export interface ContextDiagram extends Diagram {
  diagramType: "context";
  view: "context";
  roots: string[];
}

export type DiagramArtifact =
  | GenericDiagram
  | SequenceDiagram
  | DeploymentDiagram
  | BuildingBlockDiagram
  | ContextDiagram;

export interface ParseError {
  message: string;
  file: string;
  line: number;
}

export interface IgnoreDirective {
  ruleCode: string;
  reason?: string;
  file: string;
  line: number;
  /** True if at least one diagnostic with matching code and file was suppressed */
  used: boolean;
}

export interface Workspace {
  elements: Element[];
  parseErrors: ParseError[];
  /** Raw parsed documents — used by structure-aware validation rules (W004, W005) */
  documents: DocumentAst[];
  diagrams: DiagramArtifact[];
  /** Document-scoped ignore directives extracted by the builder */
  ignoreDirectives?: IgnoreDirective[];
}
