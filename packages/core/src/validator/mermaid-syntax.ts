import { parseMermaid } from "@arc42/mermaid";
import type { MermaidNotation } from "@arc42/mermaid";
import type { DiagramArtifact, Workspace } from "../model/types.ts";
import type { Diagnostic } from "./types.ts";

interface SyntaxTarget {
  notation: MermaidNotation;
  code: "E010" | "E012" | "E013" | "E014";
}

function targetFor(diagram: DiagramArtifact): SyntaxTarget | undefined {
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

/** Run Mermaid's production syntax parser for all typed Mermaid artifacts. */
export async function validateMermaidSyntax(workspace: Workspace): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  for (const diagram of workspace.diagrams) {
    const target = targetFor(diagram);
    if (!target) continue;
    // E008 owns empty-source diagnostics for all diagram notations.
    if (!diagram.source.trim()) continue;

    const result = await parseMermaid({ notation: target.notation, source: diagram.source });
    if (!result.ok) {
      diagnostics.push({
        code: target.code,
        severity: "error",
        message: `Mermaid syntax error: ${result.message}`,
        file: diagram.loc.file,
        line: diagram.loc.line,
      });
    }
  }

  for (const document of workspace.documents) {
    for (const node of document.nodes) {
      if (node.kind !== "bare-mermaid") continue;
      const result = await parseMermaid({ notation: "auto", source: node.source });
      if (!result.ok) {
        diagnostics.push({
          code: "E013",
          severity: "error",
          message: `Mermaid syntax error: ${result.message}`,
          file: document.filePath,
          line: node.startLine,
        });
      }
    }
  }
  return diagnostics;
}

/** Remove notation-specific findings for diagrams whose syntax is invalid. */
export function suppressInvalidMermaidDiagnostics(
  workspace: Workspace,
  diagnostics: Diagnostic[],
  syntaxDiagnostics: readonly Diagnostic[],
): Diagnostic[] {
  const invalidRanges = workspace.diagrams.flatMap((diagram) => {
    const target = targetFor(diagram);
    if (!target || !diagram.source.trim()) return [];
    const failed = syntaxDiagnostics.some(
      (diagnostic) =>
        diagnostic.code === target.code &&
        diagnostic.file === diagram.loc.file &&
        diagnostic.line === diagram.loc.line,
    );
    if (!failed) return [];
    return [
      {
        code: target.code,
        file: diagram.loc.file,
        start: diagram.loc.line,
        end: diagram.loc.line + diagram.source.split("\n").length,
      },
    ];
  });

  return diagnostics.filter(
    (diagnostic) =>
      !invalidRanges.some(
        (range) =>
          range.code === diagnostic.code &&
          range.file === diagnostic.file &&
          (diagnostic.line ?? 0) >= range.start &&
          (diagnostic.line ?? 0) <= range.end,
      ),
  );
}
