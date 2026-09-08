import type { Diagnostic } from "../types.ts";
import { extractMermaidEdges } from "../mermaid-utils.ts";

type DiagramType = "generic" | "sequence" | "deployment" | "building-block" | "context";

/**
 * Shared logic for duplicate-edge detection in building-block and context diagrams.
 * Used by W024 (building-block) and W025 (context).
 */
export function checkDuplicateEdges(
  diagrams: Array<{
    id: string;
    diagramType: DiagramType;
    source: string;
    loc: { file: string; line: number };
  }>,
  targetType: DiagramType,
  ruleCode: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const diagram of diagrams) {
    if (diagram.diagramType !== targetType) continue;
    if (!diagram.source || diagram.source.trim() === "") continue;

    const edges = extractMermaidEdges(diagram.source);

    const seenEdges = new Set<string>();

    for (const edge of edges) {
      const pair = `${edge.from}→${edge.to}`;
      const key = edge.label === undefined ? pair : `${pair}|${edge.label}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        continue;
      }

      const detail =
        edge.label === undefined
          ? `edge from '${edge.from}' to '${edge.to}'`
          : `edge from '${edge.from}' to '${edge.to}' with interface label '${edge.label}'`;
      diagnostics.push({
        code: ruleCode,
        severity: "warning",
        message: `Diagram '${diagram.id}' contains a duplicate ${detail} — remove the redundant occurrence`,
        file: diagram.loc.file,
        line: diagram.loc.line,
      });
    }
  }

  return diagnostics;
}
