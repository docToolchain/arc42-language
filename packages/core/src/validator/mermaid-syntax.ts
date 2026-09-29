import { mermaidSyntaxCheck } from "@cli42/lib/mermaid";
import type { MermaidSyntaxTarget } from "@cli42/lib/mermaid";
import { mermaidSyntaxParser } from "@arc42/mermaid";
import type { MermaidNotation } from "@arc42/mermaid";
import type { DiagramArtifact, Workspace } from "../model/types.ts";

function targetFor(diagram: DiagramArtifact): MermaidSyntaxTarget<MermaidNotation> | undefined {
  if (diagram.notation === "mermaid-sequence") {
    return { notation: "sequence", code: "E012" };
  }
  if (diagram.notation === "mermaid-architecture") {
    return {
      notation: "architecture",
      code:
        diagram.diagramType === "deployment"
          ? "E010"
          : diagram.diagramType === "context"
            ? "E014"
            : "E013",
    };
  }
  if (diagram.notation === "mermaid-class") {
    return { notation: "class", code: "E013" };
  }
  if (diagram.notation === "mermaid") {
    return {
      notation: "flowchart",
      code: diagram.diagramType === "context" ? "E014" : "E013",
    };
  }
  return undefined;
}

/**
 * Mermaid's production syntax parser for all typed Mermaid artifacts (E008
 * owns empty sources) and bare fences. An invalid source suppresses the
 * notation-specific findings of its own rule.
 */
export const mermaidSyntax = mermaidSyntaxCheck<MermaidNotation, DiagramArtifact, Workspace>({
  parser: mermaidSyntaxParser,
  diagram: targetFor,
  bare: () => ({ notation: "auto", code: "E013" }),
});
