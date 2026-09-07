import type { Rule, Diagnostic } from "../types.ts";
import type { DiagramArtifact, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

function diagnostic(
  diagram: DiagramArtifact,
  message: string,
  line = diagram.loc.line,
): Diagnostic {
  return {
    code: "E008",
    severity: "error",
    message: `Diagram '${diagram.id}': ${message}`,
    file: diagram.loc.file,
    line,
  };
}

/**
 * E008 — Cross-diagram integrity checks.
 *
 * Responsibilities:
 * 1. Duplicate diagram id detection across all diagram types (sequence/generic
 *    side; deployment ↔ any collisions are also caught by E010).
 * 2. Reject generic diagrams whose notation is not supported by any dedicated rule.
 *
 * Semantic validation for each diagram type lives in dedicated rules:
 *   - E010: deployment diagram source validation
 *   - E012: sequence diagram source validation
 */
export const e008DiagramValidation: Rule = {
  meta: {
    code: "E008",
    severity: "error",
    type: "problem",
    docs: {
      description: "Duplicate diagram id or unsupported diagram notation",
      rationale:
        "Each diagram artifact must have a unique id across all diagram types. Generic diagrams must reference a supported notation.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagrams = workspace.diagrams ?? [];
    const diagnostics: Diagnostic[] = [];
    const seenIds = new Set<string>();

    for (const diagram of diagrams) {
      if (seenIds.has(diagram.id)) {
        diagnostics.push(diagnostic(diagram, "duplicate diagram id"));
        continue;
      }
      seenIds.add(diagram.id);

      // Diagram types with dedicated semantic rules — nothing more to check here.
      if (
        diagram.diagramType === "deployment" ||
        diagram.diagramType === "building-block" ||
        diagram.diagramType === "context" ||
        diagram.diagramType === "sequence"
      ) {
        continue;
      }

      // Generic diagrams: no notation adapter registered yet.
      diagnostics.push(diagnostic(diagram, `unsupported notation '${diagram.notation}'`));
    }

    return diagnostics;
  },
};
