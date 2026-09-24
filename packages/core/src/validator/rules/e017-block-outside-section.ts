import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

/**
 * E017 — A block is not placed under any heading.
 *
 * Every block belongs to the section opened by the nearest preceding heading.
 * A block above the first heading (or in a document without headings) has no
 * section, so its prose cannot be associated with it — neither by readers nor
 * by tooling such as `arc42 diff`.
 */
export const e017BlockOutsideSection: Rule = {
  meta: {
    code: "E017",
    severity: "error",
    type: "problem",
    docs: {
      description: "Block is not placed under any heading — move it into a section below a heading",
      rationale:
        "A block is the structured summary of the section it lives in. Without a preceding heading the block has no section: its narrative context is undefined, and tooling that relates prose to blocks (e.g. `arc42 diff`) cannot decide which prose belongs to it.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      for (const node of doc.nodes) {
        if (node.kind === "heading") break;
        if (node.kind !== "block") continue;
        const label = node.attributes.id ?? node.blockType;
        diagnostics.push({
          code: "E017",
          severity: "error",
          message: `Block '${label}' is not placed under any heading — add a heading above it`,
          file: doc.filePath,
          line: node.startLine,
        });
      }
    }

    return diagnostics;
  },
};
