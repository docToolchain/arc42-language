import type { Rule, Diagnostic, ValidationContext } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

/**
 * W016 — A :::block is not wrapped in a DSL fence.
 *
 * The canonical authoring convention is to wrap every :::block inside a
 * notation fence so that standard Markdown/AsciiDoc renderers display it
 * as a styled, bordered code block instead of rendering the ::: lines as
 * raw text. In Markdown this is ```arc42 ... ```; in AsciiDoc it is
 * [source,arc42] followed by ---- ... ----.
 */
export const w016BlockNotInArc42Fence: Rule = {
  meta: {
    code: "W016",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Block is not wrapped in a notation fence — wrap :::blocks with the notation-appropriate fence for proper rendering",
      rationale:
        "Standard Markdown renderers do not understand the :::type syntax and render the delimiter lines as raw text. Wrapping a :::block in the notation fence causes renderers to display it as a styled, bordered code block, making the document readable in GitHub, VS Code, and AI tools without changing the DSL or the parser output. Diagram metadata must also be inside the fence so the parser can distinguish it from prose.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex, context?: ValidationContext): Diagnostic[] {
    const fenceDescription = context?.fenceDescription ?? "```arc42 fence";
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      for (const node of doc.nodes) {
        if (node.kind !== "block") continue;
        if (node.blockType === "__parse_error__") continue; // error sentinel — not a real block
        if (node.inArc42Fence) continue; // correctly wrapped

        diagnostics.push({
          code: "W016",
          severity: "warning",
          message: `Block '${node.attributes["id"] ?? node.blockType}' is not wrapped in a ${fenceDescription} — wrap it for proper rendering`,
          file: doc.filePath,
          line: node.startLine,
        });
      }
    }

    return diagnostics;
  },
};
