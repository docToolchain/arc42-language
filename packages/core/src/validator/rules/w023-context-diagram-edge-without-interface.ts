import type { Rule, Diagnostic } from "../types.ts";
import type {
  Actor,
  BuildingBlock,
  ContextDiagram,
  Interface,
  Workspace,
} from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { extractMermaidEdges } from "../mermaid-utils.ts";

/**
 * W023 — Context diagram edge validation.
 *
 * Every edge between known model elements in a context diagram must:
 * 1. Be backed by a model interface whose `between` order matches the edge direction.
 *    between[0] is the caller/consumer; between[1] is the callee/provider.
 *    A diagram edge `A --> B` is valid only if `interface.between = [A, B]`.
 * 2. Have a label that is the interface id.
 *
 * An edge drawn in the wrong direction (matching `between` in reverse) is flagged
 * separately so the author knows whether the diagram or the model declaration is wrong.
 *
 * DSL convention:
 *   actor-customer -->|"if-customer-gateway"| bb-api-gateway
 */
export const w023ContextDiagramEdgeWithoutInterface: Rule = {
  meta: {
    code: "W023",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Context diagram edge is not backed by a model interface, missing interface id label, or drawn in the wrong direction",
      rationale:
        "Context diagram edges must correspond to documented interfaces in the correct direction. between[0] is the caller, between[1] is the callee. A reversed edge misrepresents the interaction direction.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const interfaceMap = new Map<string, Interface>();
    for (const e of workspace.elements) {
      if (e.kind === "interface") interfaceMap.set(e.id, e);
    }

    const actorIds = new Set(
      workspace.elements.filter((e): e is Actor => e.kind === "actor").map((e) => e.id),
    );
    const blockIds = new Set(
      workspace.elements
        .filter((e): e is BuildingBlock => e.kind === "building-block")
        .map((e) => e.id),
    );
    const knownIds = new Set([...actorIds, ...blockIds]);

    for (const diagram of workspace.diagrams) {
      if (diagram.diagramType !== "context") continue;
      if (!diagram.source || diagram.source.trim() === "") continue;

      const ctx = diagram as ContextDiagram;
      const edges = extractMermaidEdges(diagram.source);

      for (const edge of edges) {
        // Only validate edges where both endpoints are known model elements
        if (!knownIds.has(edge.from) || !knownIds.has(edge.to)) continue;

        const label = edge.label?.trim();

        // Case 1: label matches a known interface id
        if (label && interfaceMap.has(label)) {
          const iface = interfaceMap.get(label)!;
          const [caller, callee] = iface.between;

          if (caller === edge.from && callee === edge.to) {
            // Direction correct — no diagnostic
            continue;
          }

          if (caller === edge.to && callee === edge.from) {
            // Direction reversed
            diagnostics.push({
              code: "W023",
              severity: "warning",
              message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' is drawn in the wrong direction — interface '${label}' declares caller='${caller}', callee='${callee}' (between is ordered: caller first)`,
              file: ctx.loc.file,
              line: ctx.loc.line,
            });
          } else {
            // Endpoints don't match at all
            diagnostics.push({
              code: "W023",
              severity: "warning",
              message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' uses label '${label}' but interface '${label}' connects '${caller}' and '${callee}'`,
              file: ctx.loc.file,
              line: ctx.loc.line,
            });
          }
          continue;
        }

        // Case 2: no label or label is not an interface id — find matching interface (direction-aware)
        const forwardMatch = [...interfaceMap.values()].find(
          (iface) => iface.between[0] === edge.from && iface.between[1] === edge.to,
        );

        if (forwardMatch) {
          diagnostics.push({
            code: "W023",
            severity: "warning",
            message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' should use interface id '${forwardMatch.id}' as its label`,
            file: ctx.loc.file,
            line: ctx.loc.line,
          });
          continue;
        }

        const reverseMatch = [...interfaceMap.values()].find(
          (iface) => iface.between[0] === edge.to && iface.between[1] === edge.from,
        );

        if (reverseMatch) {
          diagnostics.push({
            code: "W023",
            severity: "warning",
            message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' is drawn in the wrong direction — interface '${reverseMatch.id}' declares caller='${reverseMatch.between[0]}', callee='${reverseMatch.between[1]}' (between is ordered: caller first)`,
            file: ctx.loc.file,
            line: ctx.loc.line,
          });
          continue;
        }

        diagnostics.push({
          code: "W023",
          severity: "warning",
          message: `Context diagram '${ctx.id}': edge '${edge.from}' → '${edge.to}' has no corresponding interface in the model`,
          file: ctx.loc.file,
          line: ctx.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
