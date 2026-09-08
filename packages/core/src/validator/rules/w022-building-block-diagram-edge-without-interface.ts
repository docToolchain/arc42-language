import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlockDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { extractMermaidEdges } from "../mermaid-utils.ts";

/** Validate that building-block diagram edges represent consumer → provider requirements. */
export const w022BuildingBlockDiagramEdgeWithoutInterface: Rule = {
  meta: {
    code: "W022",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Building-block diagram edge is not backed by a model interface or is missing its label",
      rationale:
        "Diagram edges must correspond to a requirement whose interface is provided by the target block.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const interfaces = new Set(
      workspace.elements.filter((e) => e.kind === "interface").map((e) => e.id),
    );

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "building-block" || !diagram.source?.trim()) continue;
      const bb = diagram as BuildingBlockDiagram;
      for (const edge of extractMermaidEdges(diagram.source)) {
        const label = edge.label?.trim();
        const match = index.interfaceEdges.find(
          (candidate) =>
            candidate.consumer === edge.from &&
            candidate.provider === edge.to &&
            (!label || label === candidate.interface),
        );
        if (match && label === match.interface) continue;

        const unlabeledMatch = index.interfaceEdges.find(
          (candidate) => candidate.consumer === edge.from && candidate.provider === edge.to,
        );
        if (unlabeledMatch && !label) {
          diagnostics.push({
            code: "W022",
            severity: "warning",
            message: `Building-block diagram '${bb.id}': edge '${edge.from}' → '${edge.to}' should use interface id '${unlabeledMatch.interface}' as its label`,
            file: bb.loc.file,
            line: bb.loc.line,
          });
          continue;
        }

        const reverse = index.interfaceEdges.find(
          (candidate) =>
            candidate.consumer === edge.to &&
            candidate.provider === edge.from &&
            (!label || label === candidate.interface),
        );
        if (reverse) {
          diagnostics.push({
            code: "W022",
            severity: "warning",
            message: `Building-block diagram '${bb.id}': edge '${edge.from}' → '${edge.to}' is drawn in the wrong direction — interface '${reverse.interface}' requires '${reverse.consumer}' from '${reverse.provider}'`,
            file: bb.loc.file,
            line: bb.loc.line,
          });
          continue;
        }

        const labelIssue =
          label && interfaces.has(label)
            ? ` uses label '${label}' that does not match its consumer/provider relationship`
            : " has no corresponding interface in the model";
        diagnostics.push({
          code: "W022",
          severity: "warning",
          message: `Building-block diagram '${bb.id}': edge '${edge.from}' → '${edge.to}'${labelIssue}`,
          file: bb.loc.file,
          line: bb.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
