import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { AstNode } from "../../ast.ts";

/**
 * W005 — A heading section contains more than one block.
 *
 * The convention is one block per sub-chapter: each arc42 element gets its own
 * heading with prose and a single block beneath it. Multiple blocks under one
 * heading is a signal that the section should be split into sub-sections.
 */
export const w005MultipleBlocksUnderHeading: Rule = {
  meta: {
    code: "W005",
    severity: "warning",
    type: "suggestion",
    docs: {
      description: "Heading section contains more than one block — split into separate sub-sections (one block per heading)",
      rationale: "One block per heading section is the structural convention: each arc42 element gets its own sub-chapter with a heading, prose, and a block as its structured summary. Packing multiple blocks under one heading loses the per-element narrative context — readers cannot tell which prose describes which element. It also makes the document harder to navigate and reference by section.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      const nodes: AstNode[] = doc.nodes;
      let currentHeadingLine = 0;
      let currentHeadingText = "(start of file)";
      let blockCountInSection = 0;
      let firstBlockLine = 0;

      const flushSection = () => {
        if (blockCountInSection > 1) {
          diagnostics.push({
            code: "W005",
            severity: "warning",
            message: `Section '${currentHeadingText}' contains ${blockCountInSection} blocks — each block should have its own sub-section heading`,
            file: doc.filePath,
            line: firstBlockLine,
          });
        }
      };

      for (const node of nodes) {
        if (node.kind === "heading") {
          flushSection();
          currentHeadingLine = node.line;
          currentHeadingText = node.text;
          blockCountInSection = 0;
          firstBlockLine = 0;
        } else if (node.kind === "block") {
          blockCountInSection++;
          if (blockCountInSection === 1) {
            firstBlockLine = node.startLine;
          }
        }
      }

      // Flush the last section
      flushSection();
    }

    return diagnostics;
  },
};
