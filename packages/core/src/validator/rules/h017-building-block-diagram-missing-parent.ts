import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, BuildingBlockDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { sourceContainsId } from "../mermaid-utils.ts";

/**
 * H017 — A leaf building block is visualized without its parent.
 *
 * If a building block that has a `parent` appears in a building-block diagram,
 * its parent must also appear in the same diagram. Showing a child without its
 * parent hides the containment hierarchy and makes the diagram misleading.
 *
 * Union coverage: checked per-diagram (not across diagrams), because each diagram
 * is an independent view and the parent context must be visible in the same diagram.
 */
export const h017BuildingBlockDiagramMissingParent: Rule = {
  meta: {
    code: "H017",
    severity: "hint",
    type: "suggestion",
    docs: {
      description:
        "A building block is shown in a diagram without its parent — parent should also be included for hierarchy context",
      rationale:
        "arc42 building-block diagrams show system decomposition. When a child block appears, its parent must also be visible so readers understand the containment structure. Omitting the parent loses the architectural hierarchy.",
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

      // For each block that has a parent, check the parent also appears in this diagram's source.
      for (const block of blockById.values()) {
        if (!block.parent) continue; // top-level block — no parent required
        if (!sourceContainsId(diagram.source, block.id)) continue; // block not in this diagram — skip

        if (!sourceContainsId(diagram.source, block.parent)) {
          const parentBlock = blockById.get(block.parent);
          const parentLabel = parentBlock
            ? `'${block.parent}' (${parentBlock.title})`
            : `'${block.parent}'`;
          diagnostics.push({
            code: "H017",
            severity: "hint",
            message: `Building block '${block.id}' (${block.title}) is shown without its parent ${parentLabel} — add the parent to preserve hierarchy context`,
            file: bb.loc.file,
            line: bb.loc.line,
          });
        }
      }
    }

    return diagnostics;
  },
};
