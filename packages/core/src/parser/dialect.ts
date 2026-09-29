import type { DslDialect } from "@cli42/lib/parser";
import type { DiagramNode } from "../ast.ts";
import { createDiagramNode } from "./diagram-node.ts";

/**
 * The arc42 dialect of the shared DSL: `arc42` fences (```arc42 in Markdown,
 * [source,arc42] + ---- in AsciiDoc) and arc42's diagram nodes.
 */
export const ARC42_DIALECT: DslDialect<DiagramNode, "inArc42Fence"> = {
  fences: ["arc42"],
  fenceFlag: "inArc42Fence",
  createDiagram: createDiagramNode,
};
