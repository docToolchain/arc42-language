import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, BuildingBlockDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { sourceContainsId, extractMermaidSubgraphIds } from "../mermaid-utils.ts";

/**
 * H019 — A parent block in a building-block diagram is not a subgraph.
 *
 * When a building-block diagram shows a parent block alongside at least one of
 * its children, the parent should be declared as a Mermaid `subgraph` so that
 * the visual containment reflects the architectural containment.
 *
 * A plain node like `bb-core["Core Library"]` gives no visual indication that
 * it contains the child blocks shown next to it. A subgraph declaration groups
 * the children visually inside the parent box, making the hierarchy self-evident.
 *
 * Only fires when the parent AND at least one of its children are both present
 * in the same diagram. A top-level diagram that shows only parent blocks (no
 * children in scope) is unaffected.
 */
export const h019BuildingBlockDiagramParentNotSubgraph: Rule = {
  meta: {
    code: "H019",
    severity: "hint",
    type: "suggestion",
    docs: {
      description:
        "A parent block is shown in a diagram alongside its children but is not declared as a subgraph — use `subgraph` to make containment visible",
      rationale:
        "When a diagram shows both a parent block and its children, the parent should be a Mermaid subgraph. Plain nodes give no visual indication of containment; subgraphs group the children inside the parent box, making the decomposition hierarchy immediately clear to readers.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const blockById = new Map(
      workspace.elements
        .filter((e): e is BuildingBlock => e.kind === "building-block")
        .map((b) => [b.id, b]),
    );

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "building-block") continue;
      if (!diagram.source || diagram.source.trim() === "") continue;

      const bb = diagram as BuildingBlockDiagram;
      const subgraphIds = extractMermaidSubgraphIds(diagram.source);

      // Collect all model block ids present in this diagram's source
      const presentIds = new Set<string>();
      for (const block of blockById.values()) {
        if (sourceContainsId(diagram.source, block.id)) {
          presentIds.add(block.id);
        }
      }

      // Find parent blocks that have at least one child present
      const parentsWithChildren = new Set<string>();
      for (const blockId of presentIds) {
        const block = blockById.get(blockId);
        if (!block?.parent) continue;
        if (presentIds.has(block.parent)) {
          parentsWithChildren.add(block.parent);
        }
      }

      // For each such parent, check it is declared as a subgraph
      for (const parentId of parentsWithChildren) {
        if (subgraphIds.has(parentId)) continue; // correctly declared as subgraph — OK

        const parentBlock = blockById.get(parentId);
        const parentLabel = parentBlock ? `'${parentId}' (${parentBlock.title})` : `'${parentId}'`;
        diagnostics.push({
          code: "H019",
          severity: "hint",
          message: `Diagram '${diagram.id}': parent block ${parentLabel} has children in this diagram but is not declared as a subgraph — use \`subgraph ${parentId}["${parentBlock?.title ?? parentId}"]\` to show containment`,
          file: bb.loc.file,
          line: bb.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
