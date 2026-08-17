import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { AstNode } from "../../ast.ts";

/**
 * W004 — A block has no prose between it and the preceding heading (or start of file).
 *
 * Every block should be introduced by at least one prose paragraph that describes
 * the element's purpose, responsibilities, or rationale. A "naked" block with no
 * narrative context makes the document machine-readable only.
 */
export const w004BlockWithoutProse: Rule = {
  meta: {
    code: "W004",
    severity: "warning",
    type: "suggestion",
    docs: {
      description: "Block has no prose introduction — every block should be preceded by narrative text within its section",
      rationale: "The arc42 DSL is human-readable first. A block without prose is machine-readable only — it records structured metadata but shares no understanding of why the element exists, what it does, or what tradeoffs were made. The convention is: write the explanation first, then the block as its machine-readable summary. This keeps the document useful to human readers and reviewers, not just tooling.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      const nodes: AstNode[] = doc.nodes;
      let hasProseAfterLastHeading = false;

      for (const node of nodes) {
        if (node.kind === "heading") {
          // Reset prose tracking when entering a new section
          hasProseAfterLastHeading = false;
        } else if (node.kind === "prose") {
          hasProseAfterLastHeading = true;
        } else if (node.kind === "block") {
          if (!hasProseAfterLastHeading) {
            diagnostics.push({
              code: "W004",
              severity: "warning",
              message: `Block '${node.attributes["id"] ?? node.blockType}' has no prose introduction in its section`,
              file: doc.filePath,
              line: node.startLine,
            });
          }
          // After a block, prose tracking resets for the next block in the same section
          hasProseAfterLastHeading = false;
        }
      }
    }

    return diagnostics;
  },
};
