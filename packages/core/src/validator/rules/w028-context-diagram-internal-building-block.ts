import type { ContextDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { extractMermaidIds } from "../mermaid-utils.ts";
import type { Diagnostic, Rule } from "../types.ts";

/**
 * W028 — Context diagrams contain only actor-facing building blocks.
 *
 * A system context view should stop at the system boundary. Building blocks
 * that are only reached by other building blocks belong in chapter 5, not in
 * the context view. Actor-facing status is derived from actor requirements and
 * interface providers rather than from Mermaid edge direction alone.
 */
export const w028ContextDiagramInternalBuildingBlock: Rule = {
  meta: {
    code: "W028",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Context diagram lists a building block that is not directly consumed by an actor",
      rationale:
        "System context diagrams show the system boundary and its external actors. Only building blocks that provide an interface directly required by an actor belong in that view; internal-only providers should remain in the building-block view.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const buildingBlockIds = new Set(
      workspace.elements
        .filter((element) => element.kind === "building-block")
        .map((element) => element.id),
    );
    const actorIds = new Set(
      workspace.elements.filter((element) => element.kind === "actor").map((element) => element.id),
    );
    const actorFacingProviders = new Set(
      index.interfaceEdges
        .filter((edge) => actorIds.has(edge.consumer) && buildingBlockIds.has(edge.provider))
        .map((edge) => edge.provider),
    );
    const diagnostics: Diagnostic[] = [];

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "context" || !diagram.source?.trim()) continue;
      const context = diagram as ContextDiagram;

      for (const id of extractMermaidIds(diagram.source)) {
        if (!buildingBlockIds.has(id) || actorFacingProviders.has(id)) continue;
        diagnostics.push({
          code: "W028",
          severity: "warning",
          message: `Context diagram '${context.id}': building block '${id}' is not directly consumed by an actor and belongs in the building-block view`,
          file: context.loc.file,
          line: context.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
