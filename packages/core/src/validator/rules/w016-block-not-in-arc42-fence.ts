import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

/**
 * W016 — A :::block is not wrapped in a ```arc42 ``` fence.
 *
 * The canonical authoring convention is to wrap every :::block inside a
 * ```arc42 ... ``` fenced code block so that standard Markdown renderers
 * (GitHub, VS Code, editors) display it as a styled, bordered code block
 * instead of rendering the ::: lines as raw text.
 *
 * :::diagram blocks are exempt — they already have a visual pair in the
 * form of the ```mermaid ... ``` fence that follows them.
 */
export const w016BlockNotInArc42Fence: Rule = {
  meta: {
    code: "W016",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Block is not wrapped in a ```arc42 fence — wrap :::blocks with ```arc42 / ``` for proper Markdown rendering",
      rationale:
        "Standard Markdown renderers do not understand the :::type syntax and render the delimiter lines as raw text. Wrapping a :::block in ```arc42 ... ``` causes renderers to display it as a styled, bordered code block, making the document readable in GitHub, VS Code, and AI tools without changing the DSL or the parser output. :::diagram blocks are exempt because they already have a visual pair in their ```mermaid fence.",
      arc42Chapter: 0,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      for (const node of doc.nodes) {
        if (node.kind !== "block") continue;
        if (node.blockType === "diagram") continue; // exempt — has ```mermaid pair
        if (node.inArc42Fence) continue; // correctly wrapped

        diagnostics.push({
          code: "W016",
          severity: "warning",
          message: `Block '${node.attributes["id"] ?? node.blockType}' is not wrapped in a \`\`\`arc42 fence — wrap with \`\`\`arc42 / \`\`\` for proper Markdown rendering`,
          file: doc.filePath,
          line: node.startLine,
        });
      }
    }

    return diagnostics;
  },
};
