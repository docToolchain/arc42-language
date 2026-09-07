import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, BuildingBlockDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { sourceContainsId } from "../mermaid-utils.ts";

/**
 * H018 — A building-block diagram mixes abstraction levels.
 *
 * Fires when a diagram shows blocks from more than one decomposition depth
 * that cannot be explained as a single intentional drill-down. Specifically:
 *
 * A diagram is NOT mixed-abstraction when all children present share the same
 * single parent (a deliberate drill-down: one parent box + its direct children).
 *
 * A diagram IS mixed-abstraction when there are children belonging to more than
 * one distinct parent that also appears in the diagram — meaning the author has
 * accidentally put both a top-level view and a drill-down view in one picture.
 *
 * Example of a valid drill-down (does NOT fire):
 *   bb-core, bb-parser, bb-builder, bb-resolver   (all children of bb-core)
 *
 * Example of mixed abstraction (DOES fire):
 *   bb-cli, bb-core, bb-parser, bb-workspace
 *   bb-parser is a child of bb-core, and bb-core is a peer of bb-cli/bb-workspace
 *
 * Note: H017 is the complementary rule — it fires when a child is shown WITHOUT
 * its parent. H018 fires when children of different parents are mixed together.
 */
export const h018BuildingBlockDiagramMixedAbstractionLevels: Rule = {
  meta: {
    code: "H018",
    severity: "hint",
    type: "suggestion",
    docs: {
      description:
        "A building-block diagram mixes abstraction levels — children of different parents appear alongside their respective parents",
      rationale:
        "arc42 building-block diagrams are most readable at a single decomposition level. A drill-down showing one parent and all its direct children is valid. But mixing several parents with their respective children in the same view makes it impossible to see both the top-level structure and the internal detail clearly. Split into a top-level diagram and separate drill-down diagrams per parent.",
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

      // Collect all model block ids that appear in this diagram's source
      const presentIds = new Set<string>();
      for (const block of blockById.values()) {
        if (sourceContainsId(diagram.source, block.id)) {
          presentIds.add(block.id);
        }
      }

      // Find all (child, parent) pairs where both are present in the diagram
      const childParentPairs: Array<{ childId: string; parentId: string }> = [];
      for (const blockId of presentIds) {
        const block = blockById.get(blockId);
        if (!block?.parent) continue;
        if (!presentIds.has(block.parent)) continue;
        childParentPairs.push({ childId: blockId, parentId: block.parent });
      }

      if (childParentPairs.length === 0) continue; // no parent-child pairs — clean diagram

      // Determine the set of distinct parents that have children present
      const parentsWithChildren = new Set(childParentPairs.map((p) => p.parentId));

      // A single parent with its children is a legitimate drill-down — don't fire.
      // Multiple parents each with their own children in the same diagram = mixed abstraction.
      if (parentsWithChildren.size <= 1) continue;

      // Fire once per diagram listing the parents involved
      const parentLabels = [...parentsWithChildren]
        .map((id) => {
          const b = blockById.get(id);
          return b ? `'${id}' (${b.title})` : `'${id}'`;
        })
        .join(", ");

      diagnostics.push({
        code: "H018",
        severity: "hint",
        message: `Diagram '${diagram.id}' mixes abstraction levels — blocks from multiple parents appear alongside their children (${parentLabels}). Consider separate drill-down diagrams per parent.`,
        file: bb.loc.file,
        line: bb.loc.line,
      });
    }

    return diagnostics;
  },
};
