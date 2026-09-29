import { buildWorkspace as buildModel, parseAttributes } from "@cli42/lib/model";
import type { DiagramResult } from "@cli42/lib/model";
import type { DiagramNode, DocumentAst } from "../ast.ts";
import type { DiagramArtifact, Workspace } from "./types.ts";
import { DIAGRAM_SCHEMAS, ELEMENT_SCHEMAS } from "./schemas.ts";

/**
 * Validate a `:::diagram` block's metadata against the schema of its diagram
 * type and build the typed diagram artifact.
 */
function buildDiagram(
  node: DiagramNode,
  loc: { file: string; line: number },
): DiagramResult<DiagramArtifact> {
  // Build the raw attributes map for schema validation, normalising empty
  // strings to undefined so Zod's optional() treats them as absent.
  const diagramAttrs: Record<string, string | undefined> = {
    id: node.id || undefined,
    notation: node.notation || undefined,
    aliases: node.aliases || undefined,
  };
  if (node.diagramType !== "sequence") {
    // roots is present on deployment, building-block and context nodes
    const roots = (node as { roots?: string[] }).roots ?? [];
    diagramAttrs["roots"] = roots.length > 0 ? roots.join(", ") : undefined;
  }
  if (node.diagramType === "sequence") {
    diagramAttrs["scenario"] = node.scenario || undefined;
  }

  const schema =
    DIAGRAM_SCHEMAS[node.diagramType as keyof typeof DIAGRAM_SCHEMAS] ?? DIAGRAM_SCHEMAS["generic"];
  const result = parseAttributes(schema, diagramAttrs, `${node.diagramType} diagram`);
  if (!result.ok) return { issue: result.issue };

  const { id, notation, aliases, source } = node;
  const location = { file: loc.file, line: loc.line };
  switch (node.diagramType) {
    case "deployment":
    case "building-block":
    case "context":
      return {
        diagram: {
          kind: "diagram",
          diagramType: node.diagramType,
          view: node.view,
          id,
          notation,
          roots: node.roots,
          aliases,
          source,
          loc: location,
        } as DiagramArtifact,
      };
    case "sequence":
      return {
        diagram: {
          kind: "diagram",
          diagramType: "sequence",
          id,
          scenario: node.scenario,
          notation: node.notation,
          aliases,
          source,
          loc: location,
        },
      };
    default:
      return {
        diagram: {
          kind: "diagram",
          diagramType: "generic",
          id,
          notation,
          aliases,
          source,
          loc: location,
        },
      };
  }
}

export function buildWorkspace(documents: DocumentAst[]): Workspace {
  return buildModel(documents, {
    elements: ELEMENT_SCHEMAS,
    diagram: buildDiagram,
    // An explicitly authored empty path is reported as an unresolved link,
    // rather than being mistaken for an omitted field.
    keepEmpty: ["path"],
  });
}
