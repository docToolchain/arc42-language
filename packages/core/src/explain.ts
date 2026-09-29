// explain.ts — provides per-element guidance for the `arc42 explain` CLI command.
// All data is derived from the Zod schemas in schemas.ts — no separate guidance
// constant needed. Schema-level .meta() carries description/arc42Chapter/crossRefs/
// authoringTips; field-level .meta() carries description; required/enum are structural.

import {
  blockGuidance,
  formatBlockGuidance,
  formatBlockList,
  formatIgnoreGuidance,
  ignoreGuidance,
} from "@cli42/lib/explain";
import type { ExplainIgnoreResult } from "@cli42/lib/explain";
import { metaOf } from "@cli42/lib/schema";
import type { BlockType } from "./ast.ts";
import { ELEMENT_SCHEMAS, DIAGRAM_SCHEMAS } from "./model/schemas.ts";
import { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, CHAPTER_TITLE } from "./model/types.ts";

export type DiagramType = keyof typeof DIAGRAM_SCHEMAS;

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export type { ExplainCrossRefResult, ExplainFieldResult } from "@cli42/lib/explain";
import type { ExplainCrossRefResult, ExplainFieldResult } from "@cli42/lib/explain";

/** Full guidance for a single block type. */
export interface ExplainResult {
  blockType: BlockType;
  arc42Chapter: number;
  arc42ChapterTitle: string;
  description: string;
  requiredFields: ExplainFieldResult[];
  optionalFields: ExplainFieldResult[];
  crossRefs: ExplainCrossRefResult[];
  authoringTips: string[];
}

/** One-line summary entry for the list view. */
export interface ExplainSummary {
  blockType: BlockType;
  arc42Chapter: number;
  description: string;
}

/** Full guidance for a single diagram type. */
export interface ExplainDiagramResult {
  diagramType: DiagramType;
  description: string;
  requiredFields: ExplainFieldResult[];
  optionalFields: ExplainFieldResult[];
  crossRefs: ExplainCrossRefResult[];
  authoringTips: string[];
}

/** One-line summary entry for the diagram list view. */
export interface ExplainDiagramSummary {
  diagramType: DiagramType;
  description: string;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function buildResult(blockType: BlockType): ExplainResult {
  const schema = ELEMENT_SCHEMAS[blockType];
  const chapter =
    metaOf<{ arc42Chapter: number }>(schema)?.arc42Chapter ?? ELEMENT_CHAPTER[blockType];
  return {
    blockType,
    arc42Chapter: chapter,
    arc42ChapterTitle: CHAPTER_TITLE[chapter] ?? "Other",
    ...blockGuidance(schema, blockType),
  };
}

/**
 * Return full guidance for a specific block type, or summary entries for all
 * block types when called without an argument.
 */
export function explainElement(blockType: BlockType): ExplainResult;
export function explainElement(): ExplainSummary[];
export function explainElement(blockType?: BlockType): ExplainResult | ExplainSummary[] {
  if (blockType !== undefined) {
    return buildResult(blockType);
  }

  return ELEMENT_KIND_ORDER.map((bt) => ({
    blockType: bt,
    arc42Chapter: ELEMENT_CHAPTER[bt],
    description: blockGuidance(ELEMENT_SCHEMAS[bt], bt).description,
  }));
}

// ---------------------------------------------------------------------------
// Text rendering helpers
// ---------------------------------------------------------------------------

export function formatExplainText(result: ExplainResult): string {
  return formatBlockGuidance(
    `${result.blockType}  (arc42 ch. ${result.arc42Chapter} — ${result.arc42ChapterTitle})`,
    result,
  );
}

export function formatExplainListText(summaries: ExplainSummary[]): string {
  return formatBlockList(
    "arc42",
    summaries.map((s) => ({
      blockType: s.blockType,
      chapter: s.arc42Chapter,
      description: s.description,
    })),
  );
}

// ---------------------------------------------------------------------------
// Diagram explain
// ---------------------------------------------------------------------------

const DIAGRAM_TYPE_ORDER: DiagramType[] = [
  "context",
  "building-block",
  "sequence",
  "deployment",
  "generic",
];

function buildDiagramResult(diagramType: DiagramType): ExplainDiagramResult {
  return { diagramType, ...blockGuidance(DIAGRAM_SCHEMAS[diagramType], diagramType) };
}

/**
 * Return full guidance for a specific diagram type, or summary entries for all
 * diagram types when called without an argument.
 */
export function explainDiagram(diagramType: DiagramType): ExplainDiagramResult;
export function explainDiagram(): ExplainDiagramSummary[];
export function explainDiagram(
  diagramType?: DiagramType,
): ExplainDiagramResult | ExplainDiagramSummary[] {
  if (diagramType !== undefined) {
    return buildDiagramResult(diagramType);
  }

  return DIAGRAM_TYPE_ORDER.map((dt) => ({
    diagramType: dt,
    description: blockGuidance(DIAGRAM_SCHEMAS[dt], dt).description,
  }));
}

export function formatExplainDiagramText(result: ExplainDiagramResult): string {
  return formatBlockGuidance(`diagram ${result.diagramType}`, result);
}

export function formatExplainDiagramListText(summaries: ExplainDiagramSummary[]): string {
  const lines: string[] = [];
  lines.push("Diagram types (run `arc42 explain diagram <type>` for full guidance):");
  lines.push("");
  for (const s of summaries) {
    lines.push(`  ${s.diagramType.padEnd(20)} ${s.description}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Ignore directive guidance
// ---------------------------------------------------------------------------

export type { ExplainIgnoreResult };

const IGNORE_DATA: ExplainIgnoreResult = ignoreGuidance({
  cli: "arc42",
  document: "an arc42 document",
  fence: "arc42",
  example: ":::ignore H001 decision has no addresses because it is a foundational constraint",
  evidenceFile: "architecture-evidence.md",
});

/** Get full guidance for the :::ignore directive. */
export function explainIgnore(): ExplainIgnoreResult {
  return IGNORE_DATA;
}

/** Format ignore explain output as human-readable text. */
export function formatExplainIgnoreText(result: ExplainIgnoreResult): string {
  return formatIgnoreGuidance(result);
}
