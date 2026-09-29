// Meta-model element types

import type { BlockType, DocumentAst } from "../ast.ts";
import type { ElementOf, ParseError, ParseWarning, SourceLocation } from "@cli42/lib/model";
import type { IgnoreDirective } from "@cli42/lib/validator";
import { chaptersOf } from "@cli42/lib/schema";
import { ELEMENT_SCHEMAS } from "./schemas.ts";

export type { IgnoreDirective, ParseError, ParseWarning, SourceLocation };

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
export const ELEMENT_CHAPTER: Readonly<Record<BlockType, number>> = chaptersOf(
  ELEMENT_SCHEMAS,
  "arc42Chapter",
);

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

export type Element = ElementOf<typeof ELEMENT_SCHEMAS>;

type ElementKind<K extends BlockType> = Extract<Element, { kind: K }>;

export type QualityGoal = ElementKind<"quality-goal">;
export type QualityScenario = ElementKind<"quality-scenario">;
export type Actor = ElementKind<"actor">;
export type SolutionStrategy = ElementKind<"solution-strategy">;
export type BuildingBlock = ElementKind<"building-block">;
export type Interface = ElementKind<"interface">;
export type RuntimeScenario = ElementKind<"runtime-scenario">;
export type DeploymentNode = ElementKind<"deployment-node">;
export type Concept = ElementKind<"concept">;
export type Decision = ElementKind<"decision">;
export type Constraint = ElementKind<"constraint">;
export type Risk = ElementKind<"risk">;
export type GlossaryTerm = ElementKind<"glossary-term">;

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

export interface Workspace {
  elements: Element[];
  parseErrors: ParseError[];
  /** Warnings emitted during parsing — block still parsed successfully (e.g. unknown attributes). */
  parseWarnings?: ParseWarning[];
  /** Raw parsed documents — used by structure-aware validation rules (W004, W005) */
  documents: DocumentAst[];
  diagrams: DiagramArtifact[];
  /** Document-scoped ignore directives extracted by the builder */
  ignoreDirectives?: IgnoreDirective[];
}
