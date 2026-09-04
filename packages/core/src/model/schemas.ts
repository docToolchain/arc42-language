// Zod schemas for all 13 arc42 DSL block types.
// These are the single source of truth for field definitions, required/optional,
// enum values, AND all guidance metadata (description, arc42Chapter, crossRefs,
// authoringTips). Nothing is duplicated.
//
// Schema-level metadata is stored via .meta() in Zod's globalRegistry:
//   z.globalRegistry.get(schema) → { description, arc42Chapter, crossRefs, authoringTips }
//
// Field-level metadata is also stored via .meta():
//   z.globalRegistry.get(field) → { description }
//
// required/optional status and enumValues are derived structurally from the
// Zod def tree — see deriveFields().
//
// IMPORTANT: `kind` and `loc` are NOT part of the schemas — they come from the
// AST node and are injected by the builder after a successful parse.

import { z } from "zod";
import type { BlockType } from "../ast.ts";

// ---------------------------------------------------------------------------
// Cross-reference metadata type
// ---------------------------------------------------------------------------

export interface CrossRefMeta {
  field: string;
  targetKind: string;
  cardinality: "one" | "many";
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Optional comma-separated list (field may be absent). */
export const splitListSchema = z
  .string()
  .optional()
  .transform((v) =>
    v && v.trim() !== ""
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [],
  );

/** Required comma-separated list (field must be present; may be empty string → []). */
export const splitListRequiredSchema = z
  .string()
  .min(1)
  .transform((v) =>
    v.trim() !== ""
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [],
  );

// ---------------------------------------------------------------------------
// Per-element schemas — all metadata lives in .meta()
// ---------------------------------------------------------------------------

export const QualityGoalSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier (used in cross-references)" }),
    title: z.string().min(1).meta({ description: "Human-readable name of the quality goal" }),
    priority: z
      .enum(["high", "medium", "low"])
      .meta({ description: "How architecture-driving this goal is" }),
    scenario: z
      .string()
      .optional()
      .meta({ description: "ID of a quality-scenario that makes this goal measurable" }),
  })
  .meta({
    description: "An architecturally significant quality attribute goal with a priority.",
    arc42Chapter: 10,
    crossRefs: [
      { field: "scenario", targetKind: "quality-scenario", cardinality: "one" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "Limit yourself to the top 3–5 quality goals whose fulfillment matters most to your key stakeholders.",
      "Avoid buzzwords like 'high performance' — make goals concrete and measurable via quality-scenarios.",
      "These are quality goals *for the architecture*, not project goals or business goals.",
      "Use the ISO 25010 quality model or Q42 checklist to ensure you haven't missed important categories.",
    ],
  });

export const QualityScenarioSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the scenario" }),
    quality: z
      .string()
      .min(1)
      .meta({ description: "ID of the quality-goal this scenario elaborates" }),
    stimulus: z.string().optional().meta({ description: "What triggers this scenario" }),
    response: z.string().optional().meta({ description: "Expected system response" }),
    metric: z
      .string()
      .optional()
      .meta({ description: "Measurable success criterion (e.g. p95 < 500ms)" }),
  })
  .meta({
    description: "A concrete scenario that makes a quality goal measurable.",
    arc42Chapter: 10,
    crossRefs: [
      { field: "quality", targetKind: "quality-goal", cardinality: "one" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "Use the Q42 short form: stimulus (what happens), response (how the system reacts), metric (measurable acceptance criterion).",
      "Include both usage scenarios (runtime reactions) and change scenarios (effect of modifications).",
      "A scenario without a metric is not testable — always provide a concrete acceptance criterion.",
      "Scenarios are the primary input for architecture evaluation (e.g. ATAM) — keep them specific.",
    ],
  });

export const ConstraintSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the constraint" }),
    category: z
      .enum(["technical", "organizational", "convention"])
      .meta({ description: "Nature of the constraint" }),
    source: z
      .string()
      .optional()
      .meta({ description: "Where this constraint comes from (team, regulation, etc.)" }),
  })
  .meta({
    description: "A non-negotiable boundary on the architecture.",
    arc42Chapter: 2,
    crossRefs: [] satisfies CrossRefMeta[],
    authoringTips: [
      "Constraints limit your freedom of design — document them early so they inform every architectural decision.",
      "Differentiate technical, organizational, and political constraints; each has different revision paths.",
      "Document the origin (team agreement, regulation, vendor contract) so future architects know whether a constraint can be revisited.",
      "Constraints sometimes apply across the whole organisation, not just the system — note that explicitly.",
    ],
  });

export const ActorSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Name of the actor" }),
    type: z
      .enum(["person", "system"])
      .meta({ description: "Whether this is a human or an external system" }),
    description: z.string().optional().meta({ description: "What this actor does or needs" }),
  })
  .meta({
    description: "A human role or external system that interacts with the architecture.",
    arc42Chapter: 3,
    crossRefs: [] satisfies CrossRefMeta[],
    authoringTips: [
      "Actors are *external* — they live outside the system boundary. Internal components are building-blocks.",
      "In the business context show *what* data flows (domain inputs/outputs), not technical protocols — those belong in interfaces.",
      "Keep the context overview lean; a diagram plus a table of actors is usually enough (arc42 Tips 3-2, 3-3).",
      "Every actor should eventually appear in at least one interface (W002).",
    ],
  });

export const SolutionStrategySchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the strategy" }),
    addresses: splitListSchema.meta({
      description: "Comma-separated IDs of quality-goals this strategy addresses",
    }),
  })
  .meta({
    description: "A high-level architectural strategy that addresses one or more quality goals.",
    arc42Chapter: 4,
    crossRefs: [
      { field: "addresses", targetKind: "quality-goal", cardinality: "many" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "Keep it compact — a short list of keywords or a table mapping quality goals → solution approaches is ideal (arc42 Tip 4-1, 4-2).",
      "Justify *why* this approach was chosen, referencing the quality goals and constraints it satisfies.",
      "This section summarises the most fundamental decisions; details live in building-blocks, concepts, and ADRs.",
      "Link to the quality-goals you address via the addresses field to make the reasoning explicit.",
    ],
  });

export const BuildingBlockSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier (used in cross-references)" }),
    title: z.string().min(1).meta({ description: "Human-readable name" }),
    technology: z
      .string()
      .optional()
      .meta({ description: "Implementation technology (e.g. Node.js / PostgreSQL)" }),
    parent: z
      .string()
      .optional()
      .meta({ description: "ID of the parent building-block (for decomposition hierarchy)" }),
    implements: splitListSchema.meta({
      description: "Comma-separated concept IDs this block implements",
    }),
  })
  .meta({
    description: "An independently deployable software component or group of components.",
    arc42Chapter: 5,
    crossRefs: [
      { field: "parent", targetKind: "building-block", cardinality: "one" },
      { field: "implements", targetKind: "concept", cardinality: "many" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "The building block view is mandatory — always document at least level 1 (the top-level decomposition) as your starting point (arc42 Tip 5-3).",
      "Document the *responsibility* of every important black box — what it does, not how it does it (arc42 Tip 5-5).",
      "Organise building blocks hierarchically using parent to model decomposition across levels (arc42 Tip 5-2).",
      "Link to concepts via implements to make cross-cutting concerns traceable across the codebase (arc42 Tip 8-11).",
    ],
  });

export const InterfaceSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the interface" }),
    between: splitListRequiredSchema.meta({
      description:
        "Exactly two comma-separated IDs: one building-block and one actor, or two building-blocks",
    }),
    protocol: z
      .string()
      .optional()
      .meta({ description: "Communication protocol (e.g. REST, gRPC, AMQP)" }),
  })
  .superRefine((data, ctx) => {
    if (data.between.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["between"],
        message: `interface.between must have exactly 2 ids (got ${data.between.length})`,
      });
    }
  })
  .meta({
    description:
      "A defined communication boundary between two building blocks or a building block and an actor.",
    arc42Chapter: 5,
    crossRefs: [
      { field: "between", targetKind: "building-block or actor", cardinality: "many" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "between must reference exactly 2 IDs — any other count is a parse error.",
      "Document the protocol to describe the technical contract; unit tests and runtime scenarios are also valid interface specifications (arc42 Tips 5-21, 5-22, 5-23).",
      "Keep interface descriptions focused on the external contract — implementation details belong inside the building block.",
      "Business context shows data flows; the technical interface documents the protocol/channel.",
    ],
  });

export const RuntimeScenarioSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the scenario" }),
    involves: splitListSchema.meta({
      description: "Comma-separated building-block IDs participating in this scenario",
    }),
    trigger: z.string().optional().meta({ description: "What initiates this scenario" }),
  })
  .meta({
    description:
      "A concrete sequence of interactions that demonstrates a quality goal or use case at runtime.",
    arc42Chapter: 6,
    crossRefs: [
      { field: "involves", targetKind: "building-block", cardinality: "many" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "Document only a few representative scenarios — focus on architecturally significant interactions, error paths, and critical external interfaces (arc42 Tip 6-2).",
      "Map every activity in the scenario to a concrete building-block via involves (arc42 Tip 6-1).",
      "Schematic scenarios are preferred over exhaustive step-by-step traces — show the key interactions, not every message (arc42 Tip 6-3).",
      "Pair with a sequence diagram (:::diagram) to make the flow visual.",
    ],
  });

export const DeploymentNodeSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Name of the deployment node" }),
    type: z
      .enum(["server", "container", "device", "cloud-region", "environment"])
      .optional()
      .meta({ description: "Infrastructure category" }),
    hosts: splitListSchema.meta({
      description: "Comma-separated building-block IDs deployed on this node",
    }),
    parent: z
      .string()
      .optional()
      .meta({ description: "ID of the parent deployment-node (for nesting)" }),
  })
  .meta({
    description:
      "An infrastructure node in the deployment view (server, container, cloud region, etc.).",
    arc42Chapter: 7,
    crossRefs: [
      { field: "hosts", targetKind: "building-block", cardinality: "many" },
      { field: "parent", targetKind: "deployment-node", cardinality: "one" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "Document the mapping of software building-blocks to infrastructure explicitly via hosts — this is the primary purpose of the deployment view (arc42 Tips 7-5, 7-6).",
      "Organise deployment nodes hierarchically using parent (e.g. container inside cloud-region inside environment) (arc42 Tip 7-4).",
      "Document all relevant environments — at minimum development, test, and production (arc42 Tip 7-3).",
      "Focus on the software–infrastructure mapping; leave hardware-level details to infrastructure specialists.",
    ],
  });

export const ConceptSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .meta({ description: "Unique identifier (used in building-block.implements)" }),
    title: z.string().min(1).meta({ description: "Name of the concept" }),
    category: z
      .string()
      .optional()
      .meta({ description: "Free-text grouping (e.g. security, observability)" }),
  })
  .meta({
    description:
      "A cross-cutting architectural concept or pattern applied across multiple building blocks.",
    arc42Chapter: 8,
    crossRefs: [] satisfies CrossRefMeta[],
    authoringTips: [
      "Focus on the concepts that establish *conceptual integrity* — recurring patterns, standards, or rules that must be applied consistently across building blocks (arc42 Tip 8-1).",
      "Explain *how* the concept works, not just that it exists — include enough detail for implementors to apply it correctly (arc42 Tip 8-4).",
      "Restrict to the most important topics; attempting to cover everything leads to bloated, unread documentation (arc42 Tip 8-3).",
      "Hyperlink between building-blocks and the concepts they implement to keep the model navigable (arc42 Tip 8-11).",
    ],
  });

export const DecisionSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the decision" }),
    status: z
      .enum(["proposed", "accepted", "deprecated", "superseded"])
      .meta({ description: "Lifecycle state of the decision" }),
    date: z
      .string()
      .optional()
      .meta({ description: "Date the decision was made (ISO 8601 recommended)" }),
    addresses: splitListSchema.meta({
      description:
        "Comma-separated IDs of quality-goals, constraints, or risks this decision addresses",
    }),
    supersedes: z
      .string()
      .optional()
      .meta({ description: "ID of the decision this one replaces (put on the new decision)" }),
  })
  .meta({
    description:
      "An Architecture Decision Record (ADR) documenting a significant architectural choice.",
    arc42Chapter: 9,
    crossRefs: [
      { field: "addresses", targetKind: "quality-goal, constraint, or risk", cardinality: "many" },
      { field: "supersedes", targetKind: "decision", cardinality: "one" },
    ] satisfies CrossRefMeta[],
    authoringTips: [
      "Document only architecturally significant decisions — ones that affect structure, quality, dependencies, interfaces, or construction techniques (arc42 Tip 9-1).",
      "Always include the rationale: *why* was this chosen? Document the criteria and any rejected alternatives (arc42 Tips 9-2, 9-3, 9-6).",
      "Use the Nygard ADR format: title, status, context, decision, consequences (arc42 Tip 9-5).",
      "When superseding a decision, set status: superseded on the old one and add supersedes: <old-id> on the new one.",
    ],
  });

export const RiskSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "Short name for the risk" }),
    severity: z.enum(["high", "medium", "low"]).meta({ description: "How critical this risk is" }),
    mitigation: z
      .string()
      .optional()
      .meta({ description: "What is being done or could be done to reduce this risk" }),
  })
  .meta({
    description: "An architectural risk or item of technical debt with a severity assessment.",
    arc42Chapter: 11,
    crossRefs: [] satisfies CrossRefMeta[],
    authoringTips: [
      "Order risks by priority — management stakeholders use this section for risk analysis and mitigation planning (arc42 section 11).",
      "Always include a mitigation plan or at least a suggested measure; an unmitigated high-severity risk needs immediate attention.",
      "Search for risks with different stakeholders — technical and organizational risks are equally important (arc42 Tips 11-1, 11-4).",
      "Analyse external interfaces specifically for risks — they are a common source of technical debt (arc42 Tip 11-2).",
    ],
  });

export const GlossaryTermSchema = z
  .object({
    id: z.string().min(1).meta({ description: "Unique identifier" }),
    title: z.string().min(1).meta({ description: "The term being defined" }),
    definition: z
      .string()
      .min(1)
      .meta({ description: "Clear, unambiguous definition of the term" }),
  })
  .meta({
    description: "A defined term in the architecture glossary.",
    arc42Chapter: 12,
    crossRefs: [] satisfies CrossRefMeta[],
    authoringTips: [
      "Define every domain or technical term whose meaning is specific to this system — the goal is identical understanding across all stakeholders (arc42 section 12).",
      "Keep definitions compact and unambiguous; avoid circular definitions.",
      "Avoid trivia — only terms that could be misunderstood or that carry a project-specific meaning belong here (arc42 Tip 12-5).",
      "If you work in a multi-language environment, include translations (arc42 Tip 12-4).",
    ],
  });

// ---------------------------------------------------------------------------
// Schema map — keyed by BlockType for use in builder and explain
// ---------------------------------------------------------------------------

export const ELEMENT_SCHEMAS: Record<BlockType, z.ZodType> = {
  "quality-goal": QualityGoalSchema,
  "quality-scenario": QualityScenarioSchema,
  actor: ActorSchema,
  "solution-strategy": SolutionStrategySchema,
  "building-block": BuildingBlockSchema,
  interface: InterfaceSchema,
  "runtime-scenario": RuntimeScenarioSchema,
  "deployment-node": DeploymentNodeSchema,
  concept: ConceptSchema,
  decision: DecisionSchema,
  constraint: ConstraintSchema,
  risk: RiskSchema,
  "glossary-term": GlossaryTermSchema,
};

// ---------------------------------------------------------------------------
// Schema introspection — derive FieldMeta[] from Zod shape + globalRegistry
// ---------------------------------------------------------------------------

export interface FieldMeta {
  name: string;
  description: string;
  required: boolean;
  enumValues: string[] | null;
}

/**
 * Walk a ZodObject's shape and extract field metadata structurally.
 * - required: field def type is not "optional" and not a pipe whose input is "optional"
 * - enumValues: field (or unwrapped optional inner) def type is "enum" → entries keys
 * - description: from globalRegistry.get(field)?.description
 *
 * NOTE: This function inspects Zod v4 internal `_zod.def` structure. It is coupled to
 * zod@4.5.4 (pinned). If Zod is upgraded, verify this function still works correctly.
 */
export function deriveFields(schema: z.ZodObject<z.ZodRawShape>): FieldMeta[] {
  const fields: FieldMeta[] = [];

  for (const [name, field] of Object.entries(schema._zod.def.shape)) {
    const meta = z.globalRegistry.get(field as z.ZodType) as { description?: string } | undefined;
    const description = meta?.description ?? name;

    // Cast through unknown to avoid TS overlap complaints on the internal def type
    const def = (field as z.ZodType)._zod.def as unknown as Record<string, unknown>;
    let required = true;
    let enumValues: string[] | null = null;

    if (def["type"] === "optional") {
      required = false;
      const innerDef = (def["innerType"] as z.ZodType)._zod.def as unknown as Record<
        string,
        unknown
      >;
      if (innerDef["type"] === "enum") {
        enumValues = Object.keys(innerDef["entries"] as Record<string, string>);
      }
    } else if (def["type"] === "pipe") {
      // splitListSchema:         pipe(optional(string), transform) → optional
      // splitListRequiredSchema: pipe(string.min(1), transform)    → required
      const inDef = (def["in"] as z.ZodType)._zod.def as unknown as Record<string, unknown>;
      if (inDef["type"] === "optional") {
        required = false;
      }
      // required stays true for the required-list variant
    } else if (def["type"] === "enum") {
      enumValues = Object.keys(def["entries"] as Record<string, string>);
    }

    fields.push({ name, description, required, enumValues });
  }

  return fields;
}
