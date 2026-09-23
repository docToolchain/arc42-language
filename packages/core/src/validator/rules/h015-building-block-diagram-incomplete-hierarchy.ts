import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, BuildingBlockDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { basename } from "../../path-utils.ts";
import { sourceContainsId } from "../mermaid-utils.ts";

/**
 * Parse the `aliases` field of a diagram into a safe-id → model-id map.
 * Format: `bb_cap=bb-capability-map, bb_reg=bb-registry, ...`
 */
function parseAliases(aliases: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!aliases.trim()) return map;
  for (const pair of aliases.split(",")) {
    const [safeId, modelId] = pair.split("=").map((s) => s.trim());
    if (safeId && modelId) map.set(safeId, modelId);
  }
  return map;
}

/**
 * H015 — Some building blocks are absent from all building-block diagrams in chapter 5.
 *
 * Union coverage: a block is considered visualized if its id appears in the source of
 * at least one building-block diagram in the file, either directly (model id) or via
 * an alias mapping (safe id → model id). A hint fires for each block that is absent
 * from every diagram's source.
 */
export const h015BuildingBlockDiagramIncompleteHierarchy: Rule = {
  meta: {
    code: "H015",
    severity: "hint",
    type: "suggestion",
    docs: {
      description:
        "Some building blocks are absent from all building-block diagrams in the chapter 5 file",
      rationale:
        "The union of all building-block diagrams in chapter 5 should cover every building block so the full decomposition is visible.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      const base = basename(doc.filePath);
      if (!/^05-.*\.arc42\.md$/.test(base)) continue;

      const fileDiagrams = workspace.diagrams.filter(
        (d): d is BuildingBlockDiagram =>
          d.diagramType === "building-block" && d.loc.file === doc.filePath,
      );
      if (fileDiagrams.length === 0) continue; // W019 handles the no-diagram case

      const firstDiagram = fileDiagrams[0]!;
      const unionSource = fileDiagrams.map((d) => d.source).join("\n");

      // Build a set of model ids that are covered via aliases in any diagram
      const aliasedModelIds = new Set<string>();
      for (const diagram of fileDiagrams) {
        const aliasMap = parseAliases(diagram.aliases ?? "");
        for (const modelId of aliasMap.values()) {
          aliasedModelIds.add(modelId);
        }
      }

      const buildingBlocks = workspace.elements.filter(
        (e): e is BuildingBlock => e.kind === "building-block",
      );

      for (const block of buildingBlocks) {
        const coveredDirectly = sourceContainsId(unionSource, block.id);
        const coveredByAlias = aliasedModelIds.has(block.id);
        if (!coveredDirectly && !coveredByAlias) {
          diagnostics.push({
            code: "H015",
            severity: "hint",
            message: `Building block '${block.id}' (${block.title}) is not visualized in any building-block diagram`,
            file: firstDiagram.loc.file,
            line: firstDiagram.loc.line,
          });
        }
      }
    }

    return diagnostics;
  },
};
