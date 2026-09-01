import type { DocumentAst } from "../ast.ts";
import type {
  Workspace,
  Element,
  ParseError,
  QualityGoal,
  Actor,
  BuildingBlock,
  Interface,
  Concept,
  Decision,
  Constraint,
  Risk,
  GlossaryTerm,
} from "./types.ts";

const KNOWN_BLOCK_TYPES = new Set([
  "quality-goal",
  "constraint",
  "actor",
  "building-block",
  "interface",
  "concept",
  "decision",
  "risk",
  "glossary-term",
]);

function splitList(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

export function buildWorkspace(documents: DocumentAst[]): Workspace {
  const elements: Element[] = [];
  const parseErrors: ParseError[] = [];

  for (const doc of documents) {
    for (const node of doc.nodes) {
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

      const id = attributes["id"];
      const title = attributes["title"];

      if (!id) {
        parseErrors.push({ message: "Missing required attribute 'id'", file, line: startLine });
        continue;
      }
      if (!title) {
        parseErrors.push({ message: "Missing required attribute 'title'", file, line: startLine });
        continue;
      }

      if (blockType === "quality-goal") {
        const priorityRaw = attributes["priority"];
        if (!priorityRaw) {
          parseErrors.push({ message: "Missing required attribute 'priority' on quality-goal", file, line: startLine });
          continue;
        }
        if (!["high", "medium", "low"].includes(priorityRaw)) {
          parseErrors.push({ message: `Invalid priority '${priorityRaw}' — must be high | medium | low`, file, line: startLine });
          continue;
        }
        const qg: QualityGoal = {
          kind: "quality-goal",
          id,
          title,
          priority: priorityRaw as QualityGoal["priority"],
          scenario: attributes["scenario"],
          loc,
        };
        elements.push(qg);

      } else if (blockType === "actor") {
        const typeRaw = attributes["type"];
        if (!typeRaw) {
          parseErrors.push({ message: "Missing required attribute 'type' on actor — must be person | system", file, line: startLine });
          continue;
        }
        if (!["person", "system"].includes(typeRaw)) {
          parseErrors.push({ message: `Invalid type '${typeRaw}' on actor — must be person | system`, file, line: startLine });
          continue;
        }
        const actor: Actor = {
          kind: "actor",
          id,
          title,
          type: typeRaw as Actor["type"],
          description: attributes["description"] || undefined,
          loc,
        };
        elements.push(actor);

      } else if (blockType === "building-block") {
        const bb: BuildingBlock = {
          kind: "building-block",
          id,
          title,
          technology: attributes["technology"],
          parent: attributes["parent"],
          implements: splitList(attributes["implements"]),
          loc,
        };
        elements.push(bb);

      } else if (blockType === "interface") {
        const betweenList = splitList(attributes["between"]);
        if (betweenList.length !== 2) {
          parseErrors.push({ message: `interface.between must have exactly 2 ids (got ${betweenList.length})`, file, line: startLine });
          continue;
        }
        const iface: Interface = {
          kind: "interface",
          id,
          title,
          between: [betweenList[0]!, betweenList[1]!],
          protocol: attributes["protocol"],
          loc,
        };
        elements.push(iface);

      } else if (blockType === "concept") {
        const concept: Concept = {
          kind: "concept",
          id,
          title,
          category: attributes["category"],
          loc,
        };
        elements.push(concept);

      } else if (blockType === "decision") {
        const statusRaw = attributes["status"];
        if (!statusRaw) {
          parseErrors.push({ message: "Missing required attribute 'status' on decision", file, line: startLine });
          continue;
        }
        if (!["proposed", "accepted", "deprecated", "superseded"].includes(statusRaw)) {
          parseErrors.push({ message: `Invalid status '${statusRaw}' — must be proposed | accepted | deprecated | superseded`, file, line: startLine });
          continue;
        }
        const decision: Decision = {
          kind: "decision",
          id,
          title,
          status: statusRaw as Decision["status"],
          date: attributes["date"],
          addresses: splitList(attributes["addresses"]),
          supersedes: attributes["supersedes"] || undefined,
          loc,
        };
        elements.push(decision);

      } else if (blockType === "constraint") {
        const categoryRaw = attributes["category"];
        if (!categoryRaw) {
          parseErrors.push({ message: "Missing required attribute 'category' on constraint", file, line: startLine });
          continue;
        }
        if (!["technical", "organizational", "convention"].includes(categoryRaw)) {
          parseErrors.push({ message: `Invalid category '${categoryRaw}' — must be technical | organizational | convention`, file, line: startLine });
          continue;
        }
        const constraint: Constraint = {
          kind: "constraint",
          id,
          title,
          category: categoryRaw as Constraint["category"],
          source: attributes["source"] || undefined,
          loc,
        };
        elements.push(constraint);

      } else if (blockType === "risk") {
        const severityRaw = attributes["severity"];
        if (!severityRaw) {
          parseErrors.push({ message: "Missing required attribute 'severity' on risk", file, line: startLine });
          continue;
        }
        if (!["high", "medium", "low"].includes(severityRaw)) {
          parseErrors.push({ message: `Invalid severity '${severityRaw}' — must be high | medium | low`, file, line: startLine });
          continue;
        }
        const risk: Risk = {
          kind: "risk",
          id,
          title,
          severity: severityRaw as Risk["severity"],
          mitigation: attributes["mitigation"] || undefined,
          loc,
        };
        elements.push(risk);

      } else if (blockType === "glossary-term") {
        const definition = attributes["definition"];
        if (!definition) {
          parseErrors.push({ message: "Missing required attribute 'definition' on glossary-term", file, line: startLine });
          continue;
        }
        const term: GlossaryTerm = {
          kind: "glossary-term",
          id,
          title,
          definition,
          loc,
        };
        elements.push(term);
      }
    }
  }

  return { elements, parseErrors, documents };
}
