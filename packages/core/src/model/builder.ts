import type { DocumentAst } from "../ast.ts";
import type {
  Workspace,
  Element,
  ParseError,
  QualityGoal,
  QualityScenario,
  Actor,
  SolutionStrategy,
  BuildingBlock,
  Interface,
  Concept,
  Decision,
  Constraint,
  Risk,
  GlossaryTerm,
  RuntimeScenario,
  DeploymentNode,
  DeploymentDiagram,
  DiagramArtifact,
} from "./types.ts";
import { ELEMENT_SCHEMAS } from "./schemas.ts";
import type { BlockType } from "../ast.ts";

const KNOWN_BLOCK_TYPES = new Set<string>([
  "quality-goal",
  "quality-scenario",
  "constraint",
  "actor",
  "solution-strategy",
  "building-block",
  "interface",
  "concept",
  "decision",
  "risk",
  "glossary-term",
  "runtime-scenario",
  "deployment-node",
]);

/**
 * Map a Zod parse failure into a human-friendly ParseError message that
 * matches the regex expectations in existing tests.
 *
 * The builder owns the error message format; Zod's raw messages are never
 * forwarded to callers.
 *
 * We distinguish "missing" from "invalid enum" by checking the raw input:
 * if the attribute value is undefined/empty it's missing; otherwise it's an
 * invalid enum value.
 */
function zodErrorToMessage(
  blockType: string,
  // z.ZodError.issues in v4 is typed as $ZodIssue[] which is not directly
  // compatible with a structural type — cast through unknown at the call site.
  issues: { path: (string | number)[]; message: string }[],
  attributes: Record<string, string>,
): string {
  // Use the first issue only — one error per block is the existing contract.
  const issue = issues[0];
  if (!issue) return `Invalid ${blockType}`;

  const field = issue.path[0];

  // Special-case: between cardinality.
  // Whether the issue is missing, empty, or wrong count, always emit the
  // canonical cardinality message so callers get consistent, friendly output.
  if (field === "between") {
    const raw = attributes["between"];
    const betweenList =
      raw && raw.trim() !== ""
        ? raw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];
    return `interface.between must have exactly 2 ids (got ${betweenList.length})`;
  }

  if (typeof field === "string") {
    const rawValue = attributes[field];
    const isMissing = rawValue === undefined || rawValue.trim() === "";

    if (isMissing) {
      // Some fields need the block type in the "missing" message for test compat
      if (field === "type" && blockType === "actor") {
        return `Missing required attribute 'type' on actor — must be person | system`;
      }
      return `Missing required attribute '${field}'`;
    }

    // Value is present but invalid — emit enum-aware messages
    if (field === "priority") {
      return `Invalid priority — must be high | medium | low`;
    }
    if (field === "severity") {
      return `Invalid severity — must be high | medium | low`;
    }
    if (field === "status") {
      return `Invalid status — must be proposed | accepted | deprecated | superseded`;
    }
    if (field === "category" && blockType === "constraint") {
      return `Invalid category — must be technical | organizational | convention`;
    }
    if (field === "type" && blockType === "actor") {
      return `Invalid type on actor — must be person | system`;
    }
    if (field === "type" && blockType === "deployment-node") {
      return `Invalid type on deployment-node — must be server | container | device | cloud-region | environment`;
    }

    return `Invalid value for '${field}' on ${blockType}`;
  }

  return `Invalid ${blockType}: ${issue.message}`;
}

export function buildWorkspace(documents: DocumentAst[]): Workspace {
  const elements: Element[] = [];
  const parseErrors: ParseError[] = [];
  const diagrams: DiagramArtifact[] = [];

  for (const doc of documents) {
    for (const node of doc.nodes) {
      if (node.kind === "diagram") {
        if (node.diagramType === "deployment") {
          const deploymentDiagram: DeploymentDiagram = {
            kind: "diagram",
            diagramType: "deployment",
            view: "deployment",
            id: node.id,
            notation: node.notation,
            roots: node.roots,
            aliases: node.aliases,
            source: node.source,
            loc: { file: doc.filePath, line: node.startLine },
          };
          diagrams.push(deploymentDiagram);
          continue;
        }
        if (!node.id || !node.notation || (node.diagramType === "sequence" && !node.scenario)) {
          parseErrors.push({
            message:
              node.diagramType === "sequence"
                ? "Sequence diagram requires 'id', 'scenario', and 'notation'"
                : "Diagram requires 'id' and 'notation'",
            file: doc.filePath,
            line: node.startLine,
          });
          continue;
        }
        if (node.diagramType === "sequence") {
          diagrams.push({
            kind: "diagram",
            diagramType: "sequence",
            id: node.id,
            scenario: node.scenario,
            notation: node.notation,
            aliases: node.aliases,
            source: node.source,
            loc: { file: doc.filePath, line: node.startLine },
          });
        } else {
          diagrams.push({
            kind: "diagram",
            diagramType: "generic",
            id: node.id,
            notation: node.notation,
            aliases: node.aliases,
            source: node.source,
            loc: { file: doc.filePath, line: node.startLine },
          });
        }
        continue;
      }
      if (node.kind !== "block") continue;

      const { blockType, attributes, startLine } = node;
      const file = doc.filePath;
      const loc = { file, line: startLine };

      if (!KNOWN_BLOCK_TYPES.has(blockType)) {
        parseErrors.push({
          message: `Unknown block type '${blockType}'`,
          file,
          line: startLine,
        });
        continue;
      }

      const schema = ELEMENT_SCHEMAS[blockType as BlockType];

      // Normalise empty strings to undefined so Zod's optional() treats them
      // as absent (the DSL parser emits "" for `key:` with no value).
      const normalisedAttrs: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(attributes)) {
        normalisedAttrs[k] = v === "" || v.trim() === "" ? undefined : v;
      }

      const result = schema.safeParse(normalisedAttrs);

      if (!result.success) {
        parseErrors.push({
          message: zodErrorToMessage(
            blockType,
            result.error.issues as { path: (string | number)[]; message: string }[],
            attributes,
          ),
          file,
          line: startLine,
        });
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = result.data as any;

      switch (blockType as BlockType) {
        case "quality-goal": {
          const el: QualityGoal = {
            kind: "quality-goal",
            id: data.id,
            title: data.title,
            priority: data.priority,
            scenario: data.scenario,
            loc,
          };
          elements.push(el);
          break;
        }
        case "quality-scenario": {
          const el: QualityScenario = {
            kind: "quality-scenario",
            id: data.id,
            title: data.title,
            quality: data.quality,
            stimulus: data.stimulus || undefined,
            response: data.response || undefined,
            metric: data.metric || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "actor": {
          const el: Actor = {
            kind: "actor",
            id: data.id,
            title: data.title,
            type: data.type,
            description: data.description || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "solution-strategy": {
          const el: SolutionStrategy = {
            kind: "solution-strategy",
            id: data.id,
            title: data.title,
            addresses: data.addresses,
            loc,
          };
          elements.push(el);
          break;
        }
        case "building-block": {
          const el: BuildingBlock = {
            kind: "building-block",
            id: data.id,
            title: data.title,
            technology: data.technology,
            parent: data.parent,
            implements: data.implements,
            loc,
          };
          elements.push(el);
          break;
        }
        case "interface": {
          const el: Interface = {
            kind: "interface",
            id: data.id,
            title: data.title,
            between: [data.between[0], data.between[1]],
            protocol: data.protocol,
            loc,
          };
          elements.push(el);
          break;
        }
        case "runtime-scenario": {
          const el: RuntimeScenario = {
            kind: "runtime-scenario",
            id: data.id,
            title: data.title,
            involves: data.involves,
            trigger: data.trigger || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "deployment-node": {
          const el: DeploymentNode = {
            kind: "deployment-node",
            id: data.id,
            title: data.title,
            type: data.type,
            hosts: data.hosts,
            parent: data.parent || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "concept": {
          const el: Concept = {
            kind: "concept",
            id: data.id,
            title: data.title,
            category: data.category,
            loc,
          };
          elements.push(el);
          break;
        }
        case "decision": {
          const el: Decision = {
            kind: "decision",
            id: data.id,
            title: data.title,
            status: data.status,
            date: data.date,
            addresses: data.addresses,
            supersedes: data.supersedes || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "constraint": {
          const el: Constraint = {
            kind: "constraint",
            id: data.id,
            title: data.title,
            category: data.category,
            source: data.source || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "risk": {
          const el: Risk = {
            kind: "risk",
            id: data.id,
            title: data.title,
            severity: data.severity,
            mitigation: data.mitigation || undefined,
            loc,
          };
          elements.push(el);
          break;
        }
        case "glossary-term": {
          const el: GlossaryTerm = {
            kind: "glossary-term",
            id: data.id,
            title: data.title,
            definition: data.definition,
            loc,
          };
          elements.push(el);
          break;
        }
      }
    }
  }

  return { elements, parseErrors, documents, diagrams };
}
