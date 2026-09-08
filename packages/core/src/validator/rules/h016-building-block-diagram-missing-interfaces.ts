import type { Rule, Diagnostic } from "../types.ts";
import type {
  BuildingBlock,
  BuildingBlockDiagram,
  Interface,
  Workspace,
} from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { basename } from "../../path-utils.ts";
import { sourceContainsId } from "../mermaid-utils.ts";

/**
 * H016 — Some interfaces between visualized building blocks are missing from
 * the building-block diagrams in chapter 5.
 *
 * Union coverage: an interface is considered visualized if its id appears in
 * the source of at least one building-block diagram in the file. A hint fires
 * for each interface whose both endpoints are visualized but whose id is absent
 * from every diagram source.
 *
 * Note: checking by id matches the typical Mermaid edge pattern where the
 * interface id is used as a node or label identifier. If the author uses a
 * different identifier in the diagram, this hint may be a false positive — it
 * is intentionally low-noise (hint severity).
 */
export const h016BuildingBlockDiagramMissingInterfaces: Rule = {
  meta: {
    code: "H016",
    severity: "hint",
    type: "suggestion",
    docs: {
      description:
        "Some interfaces between visualized building blocks are missing from the building-block diagrams",
      rationale:
        "When both endpoints of an interface are visualized in a building-block diagram, the interface edge should also appear so the diagram is structurally complete.",
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
      if (fileDiagrams.length === 0) continue;

      const firstDiagram = fileDiagrams[0]!;
      const unionSource = fileDiagrams.map((d) => d.source).join("\n");

      // Determine which block ids are visualized across all diagrams
      const buildingBlocks = workspace.elements.filter(
        (e): e is BuildingBlock => e.kind === "building-block",
      );
      const visualizedBlockIds = new Set(
        buildingBlocks.filter((b) => sourceContainsId(unionSource, b.id)).map((b) => b.id),
      );

      const interfaces = workspace.elements.filter((e): e is Interface => e.kind === "interface");

      for (const iface of interfaces) {
        const [a, b] = iface.between;
        if (visualizedBlockIds.has(a) && visualizedBlockIds.has(b)) {
          // Both endpoints are visualized — the interface id should appear in at least one source
          if (!sourceContainsId(unionSource, iface.id)) {
            diagnostics.push({
              code: "H016",
              severity: "hint",
              message: `Interface '${iface.id}' (${iface.title}) between visualized blocks '${a}' and '${b}' is not shown in any building-block diagram`,
              file: firstDiagram.loc.file,
              line: firstDiagram.loc.line,
            });
          }
        }
      }
    }

    return diagnostics;
  },
};
