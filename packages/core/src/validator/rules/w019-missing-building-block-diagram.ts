import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import { basename } from "../../path-utils.ts";

export const w019MissingBuildingBlockDiagram: Rule = {
  meta: {
    code: "W019",
    severity: "warning",
    type: "suggestion",
    docs: {
      description: "Chapter 5 (Building Block View) has no building-block diagram",
      rationale:
        "arc42 chapter 5 should contain at least one building-block diagram visualizing the system decomposition.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const doc of workspace.documents) {
      const base = basename(doc.filePath);
      if (!/^05-.*\.arc42\.md$/.test(base)) continue;
      const hasDiagram = workspace.diagrams.some(
        (d) => d.diagramType === "building-block" && d.loc.file === doc.filePath,
      );
      if (!hasDiagram) {
        diagnostics.push({
          code: "W019",
          severity: "warning",
          message:
            "Chapter 5 (Building Block View) has no building-block diagram — add a :::diagram view: building-block block",
          file: doc.filePath,
          line: 1,
        });
      }
    }
    return diagnostics;
  },
};
