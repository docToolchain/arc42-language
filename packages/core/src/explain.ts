// explain.ts — provides per-element guidance for the `arc42 explain` CLI command.
// All data is derived from the Zod schemas in schemas.ts — no separate guidance
// constant needed. Schema-level .meta() carries description/arc42Chapter/crossRefs/
// authoringTips; field-level .meta() carries description; required/enum are structural.

import { z } from "zod";
import type { BlockType } from "./ast.ts";
import {
  ELEMENT_SCHEMAS,
  DIAGRAM_SCHEMAS,
  deriveFields,
  type CrossRefMeta,
} from "./model/schemas.ts";
import { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, CHAPTER_TITLE } from "./model/types.ts";

export type DiagramType = keyof typeof DIAGRAM_SCHEMAS;

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
  const schema = DIAGRAM_SCHEMAS[diagramType];
  const meta = (z.globalRegistry.get(schema) ?? {}) as SchemaMeta;

  const description = meta.description ?? diagramType;
  const crossRefs = meta.crossRefs ?? [];
  const authoringTips = meta.authoringTips ?? [];

  const allFields = deriveFields(schema as z.ZodObject<z.ZodRawShape>);

  return {
    diagramType,
    description,
    requiredFields: allFields.filter((f) => f.required),
    optionalFields: allFields.filter((f) => !f.required),
    crossRefs,
    authoringTips,
  };
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

  return DIAGRAM_TYPE_ORDER.map((dt) => {
    const schema = DIAGRAM_SCHEMAS[dt];
    const meta = (z.globalRegistry.get(schema) ?? {}) as SchemaMeta;
    return {
      diagramType: dt,
      description: meta.description ?? dt,
    };
  });
}

export function formatExplainDiagramText(result: ExplainDiagramResult): string {
  const lines: string[] = [];
  lines.push(`diagram ${result.diagramType}`);
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

/** Full guidance for the :::ignore directive. */
export interface ExplainIgnoreResult {
  name: string;
  description: string;
  syntax: string[];
  constraints: string[];
  authoringTips: string[];
}

const IGNORE_DATA: ExplainIgnoreResult = {
  name: "ignore directive",
  description:
    "The :::ignore directive suppresses a specific warning (W) or hint (H) diagnostic on a " +
    "given line of an arc42 document. It must appear inside a ```arc42 fence. " +
    "Outside the fence, :::ignore is treated as prose and has no effect.\n\n" +
    "Only warnings (W-prefix) and hints (H-prefix) can be suppressed. Errors (E-prefix) are " +
    "structural — the affected block is excluded from the model and must be fixed, not ignored. " +
    "Attempting to ignore an error code emits W030 instead.",
  syntax: [
    "Single-line form:",
    "  :::ignore W001 reason on one line :::",
    "",
    "Multi-line form:",
    "  :::ignore W001 reason on first line",
    "  :::",
    "",
    "Both forms must be inside a ```arc42 fence:",
    "  ```arc42",
    "  :::ignore H001 decision has no addresses because it is a foundational constraint",
    "  :::",
    "  ```",
  ],
  constraints: [
    "Only W (warning) and H (hint) rule codes can be ignored.",
    "Attempting to ignore an E (error) code emits W030 — errors must be fixed.",
    "An ignore directive suppresses the next matching diagnostic in the same file at or after the directive line.",
    "An unused ignore directive emits W019 (stale ignore). Remove it when the underlying issue is resolved.",
  ],
  authoringTips: [
    "Always provide a reason — it documents why the suppression is intentional.",
    "Record each suppressed hint in architecture-evidence.md with the rule code, element id, and reason.",
    "Run `arc42 validate` after adding an ignore to confirm the directive is used (no W019).",
    "Run `arc42 get --type ignore` to list all ignore directives in the workspace.",
    "If you are suppressing a warning (W), discuss with the team first — warnings usually indicate a real gap.",
  ],
};

/** Get full guidance for the :::ignore directive. */
export function explainIgnore(): ExplainIgnoreResult {
  return IGNORE_DATA;
}

/** Format ignore explain output as human-readable text. */
export function formatExplainIgnoreText(result: ExplainIgnoreResult): string {
  const lines: string[] = [];
  lines.push(`Directive: ${result.name}`);
  lines.push(`\n${result.description}`);

  lines.push("\nSyntax:");
  for (const line of result.syntax) {
    lines.push(line ? `  ${line}` : "");
  }

  lines.push("\nConstraints:");
  for (const c of result.constraints) {
    lines.push(`    - ${c}`);
  }

  if (result.authoringTips.length > 0) {
    lines.push("\n  Authoring tips:");
    for (const tip of result.authoringTips) {
      lines.push(`    - ${tip}`);
    }
  }

  return lines.join("\n");
}
