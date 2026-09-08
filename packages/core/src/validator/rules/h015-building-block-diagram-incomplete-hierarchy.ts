import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, BuildingBlockDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { basename } from "../../path-utils.ts";
import { sourceContainsId } from "../mermaid-utils.ts";

/**
 * H015 — Some building blocks are absent from all building-block diagrams in chapter 5.
 *
 * Union coverage: a block is considered visualized if its id appears in the source of
 * at least one building-block diagram in the file. A hint fires for each block that
 * is absent from every diagram's source.
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

      const buildingBlocks = workspace.elements.filter(
        (e): e is BuildingBlock => e.kind === "building-block",
      );

      for (const block of buildingBlocks) {
        if (!sourceContainsId(unionSource, block.id)) {
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
