import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import path from "node:path";

export const w020MissingContextDiagram: Rule = {
  meta: {
    code: "W020",
    severity: "warning",
    type: "suggestion",
    docs: {
      description: "Chapter 3 (System Scope and Context) has no context diagram",
      rationale:
        "arc42 chapter 3 should contain at least one context diagram visualizing actors and their interfaces.",
      arc42Chapter: 3,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const doc of workspace.documents) {
      const base = path.basename(doc.filePath);
      if (!/^03-.*\.arc42\.md$/.test(base)) continue;
      const hasDiagram = workspace.diagrams.some(
        (d) => d.diagramType === "context" && d.loc.file === doc.filePath,
      );
      if (!hasDiagram) {
        diagnostics.push({
          code: "W020",
          severity: "warning",
          message:
            "Chapter 3 (System Scope and Context) has no context diagram — add a :::diagram view: context block",
          file: doc.filePath,
          line: 1,
        });
      }
    }
    return diagnostics;
  },
};
