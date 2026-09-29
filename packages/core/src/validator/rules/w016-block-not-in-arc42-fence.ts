import { blockNotInFenceRule } from "@cli42/lib/rules";
import type { Rule, RuleDocs, ValidationContext } from "../types.ts";

/**
 * W016 — A :::block is not wrapped in a DSL fence.
 *
 * The canonical authoring convention is to wrap every :::block inside a
 * notation fence so that standard Markdown/AsciiDoc renderers display it
 * as a styled, bordered code block instead of rendering the ::: lines as
 * raw text. In Markdown this is ```arc42 ... ```; in AsciiDoc it is
 * [source,arc42] followed by ---- ... ----.
 */
export const w016BlockNotInArc42Fence: Rule = blockNotInFenceRule<ValidationContext, RuleDocs>(
  {
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
  {
    fenceFlag: "inArc42Fence",
    fenceDescription: (context) => context?.fenceDescription ?? "```arc42 fence",
  },
);
