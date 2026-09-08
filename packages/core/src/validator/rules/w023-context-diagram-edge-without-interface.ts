import type { Rule, Diagnostic } from "../types.ts";
import type { ContextDiagram, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { extractMermaidEdges } from "../mermaid-utils.ts";

/** Validate that context diagram edges represent actor/building-block requirements. */
export const w023ContextDiagramEdgeWithoutInterface: Rule = {
  meta: {
    code: "W023",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Context diagram edge is not backed by a model interface or is missing its label",
      rationale:
        "Context edges must correspond to a consumer requirement whose interface is provided by the target block.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const knownIds = new Set(
      workspace.elements
        .filter((e) => e.kind === "actor" || e.kind === "building-block")
        .map((e) => e.id),
    );
    const interfaces = new Set(
      workspace.elements.filter((e) => e.kind === "interface").map((e) => e.id),
    );

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "context" || !diagram.source?.trim()) continue;
      const ctx = diagram as ContextDiagram;
      for (const edge of extractMermaidEdges(diagram.source)) {
        if (!knownIds.has(edge.from) || !knownIds.has(edge.to)) continue;
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
            code: "W023",
            severity: "warning",
            message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' should use interface id '${unlabeledMatch.interface}' as its label`,
            file: ctx.loc.file,
            line: ctx.loc.line,
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
            code: "W023",
            severity: "warning",
            message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' is drawn in the wrong direction — interface '${reverse.interface}' requires '${reverse.consumer}' from '${reverse.provider}'`,
            file: ctx.loc.file,
            line: ctx.loc.line,
          });
          continue;
        }

        const labelIssue =
          label && interfaces.has(label)
            ? ` uses label '${label}' that does not match its consumer/provider relationship`
            : " has no corresponding interface in the model";
        diagnostics.push({
          code: "W023",
          severity: "warning",
          message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}'${labelIssue}`,
          file: ctx.loc.file,
          line: ctx.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
