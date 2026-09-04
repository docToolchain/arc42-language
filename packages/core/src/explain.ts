// explain.ts — provides per-element guidance for the `arc42 explain` CLI command.
// All data is derived from the Zod schemas in schemas.ts — no separate guidance
// constant needed. Schema-level .meta() carries description/arc42Chapter/crossRefs/
// authoringTips; field-level .meta() carries description; required/enum are structural.

import { z } from "zod";
import type { BlockType } from "./ast.ts";
import { ELEMENT_SCHEMAS, deriveFields, type CrossRefMeta } from "./model/schemas.ts";
import { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, CHAPTER_TITLE } from "./model/types.ts";

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface ExplainFieldResult {
  name: string;
  description: string;
  required: boolean;
  enumValues: string[] | null;
}

export interface ExplainCrossRefResult {
  field: string;
  targetKind: string;
  cardinality: "one" | "many";
}

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

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

interface SchemaMeta {
  description?: string;
  arc42Chapter?: number;
  crossRefs?: CrossRefMeta[];
  authoringTips?: string[];
}

function buildResult(blockType: BlockType): ExplainResult {
  const schema = ELEMENT_SCHEMAS[blockType];
  const meta = (z.globalRegistry.get(schema) ?? {}) as SchemaMeta;

  const chapter = meta.arc42Chapter ?? ELEMENT_CHAPTER[blockType];
  const description = meta.description ?? blockType;
  const crossRefs = meta.crossRefs ?? [];
  const authoringTips = meta.authoringTips ?? [];

  // deriveFields works on ZodObject — unwrap the superRefine pipe wrapper if present
  const objectSchema =
    schema instanceof z.ZodObject
      ? schema
      : (schema as z.ZodPipe)._zod?.def?.in instanceof z.ZodObject
        ? ((schema as z.ZodPipe)._zod.def.in as z.ZodObject<z.ZodRawShape>)
        : null;

  const allFields = objectSchema ? deriveFields(objectSchema) : [];

  return {
    blockType,
    arc42Chapter: chapter,
    arc42ChapterTitle: CHAPTER_TITLE[chapter] ?? "Other",
    description,
    requiredFields: allFields.filter((f) => f.required),
    optionalFields: allFields.filter((f) => !f.required),
    crossRefs,
    authoringTips,
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

  return ELEMENT_KIND_ORDER.map((bt) => {
    const schema = ELEMENT_SCHEMAS[bt];
    const meta = (z.globalRegistry.get(schema) ?? {}) as SchemaMeta;
    return {
      blockType: bt,
      arc42Chapter: ELEMENT_CHAPTER[bt],
      description: meta.description ?? bt,
    };
  });
}

// ---------------------------------------------------------------------------
// Text rendering helpers
// ---------------------------------------------------------------------------

export function formatExplainText(result: ExplainResult): string {
  const lines: string[] = [];
  lines.push(
    `${result.blockType}  (arc42 ch. ${result.arc42Chapter} — ${result.arc42ChapterTitle})`,
  );
  lines.push("");
  lines.push(`  ${result.description}`);

  if (result.requiredFields.length > 0) {
    lines.push("");
    lines.push("  Required fields:");
    for (const f of result.requiredFields) {
      const enumSuffix = f.enumValues ? `  [${f.enumValues.join(" | ")}]` : "";
      lines.push(`    ${f.name.padEnd(14)} ${f.description}${enumSuffix}`);
    }
  }

  if (result.optionalFields.length > 0) {
    lines.push("");
    lines.push("  Optional fields:");
    for (const f of result.optionalFields) {
      const enumSuffix = f.enumValues ? `  [${f.enumValues.join(" | ")}]` : "";
      lines.push(`    ${f.name.padEnd(14)} ${f.description}${enumSuffix}`);
    }
  }

  if (result.crossRefs.length > 0) {
    lines.push("");
    lines.push("  Cross-references:");
    for (const c of result.crossRefs) {
      const card = c.cardinality === "many" ? "(comma-separated)" : "";
      lines.push(`    ${c.field.padEnd(14)} → ${c.targetKind} ${card}`.trimEnd());
    }
  }

  if (result.authoringTips.length > 0) {
    lines.push("");
    lines.push("  Authoring tips:");
    for (const tip of result.authoringTips) {
      lines.push(`    - ${tip}`);
    }
  }

  return lines.join("\n");
}

export function formatExplainListText(summaries: ExplainSummary[]): string {
  const lines: string[] = [];
  lines.push("Block types (run `arc42 explain <type>` for full guidance):");
  lines.push("");
  for (const s of summaries) {
    lines.push(
      `  ${s.blockType.padEnd(20)} ch.${String(s.arc42Chapter).padEnd(3)}  ${s.description}`,
    );
  }
  return lines.join("\n");
}
