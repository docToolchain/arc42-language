import type { MermaidParseRequest, MermaidParseResult, MermaidSyntaxParser } from "./model.ts";

let mermaidPromise: ReturnType<typeof importMermaid> | undefined;

function importMermaid() {
  return import("mermaid").then(({ default: instance }) => instance);
}

function getMermaid() {
  mermaidPromise ??= importMermaid().catch((error: unknown) => {
    mermaidPromise = undefined;
    throw error;
  });
  return mermaidPromise;
}

const diagramHeaders: Record<MermaidParseRequest["notation"], string[]> = {
  architecture: ["architecture-beta"],
  sequence: ["sequenceDiagram"],
  flowchart: ["flowchart", "graph"],
  class: ["classDiagram"],
  auto: [],
};

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return String(error);
}

function hasExpectedHeader(source: string, notation: MermaidParseRequest["notation"]): boolean {
  if (notation === "auto") return true;
  const firstLine = source.trimStart().split(/\r?\n/u, 1)[0]?.trim() ?? "";
  return diagramHeaders[notation].some((header) =>
    header === "flowchart" || header === "graph"
      ? firstLine === header || firstLine.startsWith(`${header} `)
      : firstLine === header,
  );
}

/**
 * Mermaid's Node parser currently reaches its browser sanitizer for some
 * flowchart and sequence labels. Keep the structural parse useful in Node by
 * retrying those sources without presentation text when the sanitizer is not
 * available. The original source is always parsed first.
 */
function withoutBrowserText(source: string, notation: MermaidParseRequest["notation"]): string {
  if (notation === "flowchart") {
    return source
      .replace(/^(\s*subgraph\s+\S+)\s*\["[^"\n]*"\]/gmu, "$1")
      .replace(/\(\["[^"\n]*"\]\)/gu, "")
      .replace(/\["[^"\n]*"\]/gu, "")
      .replace(/\|"[^"\n]*"\|/gu, "");
  }

  if (notation === "sequence") {
    return source.replace(/\s+as\s+"[^"\n]*"/gu, "").replace(/:\s+[^\n]*$/gmu, ":");
  }
  return source;
}

function withoutFlowchartGroups(source: string): string {
  // WHY: Mermaid 11.17.2 still calls browser-only DOMPurify while parsing
  // subgraph titles in Node. This last-resort input is used only after the
  // original source and a label-preserving structural retry both fail with
  // that environment error. Removing group decoration lets us validate the
  // remaining node/edge grammar without changing the source used for render
  // or semantic validation; group-specific syntax remains a known limitation.
  return source.replace(/^\s*subgraph[^\n]*$/gmu, "").replace(/^\s*end\s*$/gmu, "");
}

/** Default syntax parser backed by Mermaid's production parser. */
export const mermaidSyntaxParser: MermaidSyntaxParser = {
  async parse({ notation, source }): Promise<MermaidParseResult> {
    if (!source.trim()) {
      return { ok: false, notation, message: "Diagram source must not be empty." };
    }

    if (!hasExpectedHeader(source, notation)) {
      return {
        ok: false,
        notation,
        message: `Expected a ${notation} Mermaid diagram header.`,
      };
    }

    try {
      const parser = await getMermaid();
      let parsed;
      try {
        parsed = await parser.parse(source, { suppressErrors: false });
      } catch (error) {
        const normalized = withoutBrowserText(source, notation);
        const sanitizerUnavailable = /DOMPurify|purify/iu.test(normalizeError(error));
        if (!sanitizerUnavailable || normalized === source) {
          throw error;
        }
        try {
          parsed = await parser.parse(normalized, { suppressErrors: false });
        } catch (normalizedError) {
          // Mermaid sanitizes subgraph titles even after their labels are
          // removed. As a last Node-only fallback, validate the remaining
          // flowchart grammar without group decoration.
          if (
            notation !== "flowchart" ||
            !/DOMPurify|purify/iu.test(normalizeError(normalizedError))
          ) {
            throw normalizedError;
          }
          parsed = await parser.parse(withoutFlowchartGroups(normalized), {
            suppressErrors: false,
          });
        }
      }
      return { ok: true, notation, diagramType: parsed.diagramType };
    } catch (error) {
      return { ok: false, notation, message: normalizeError(error) };
    }
  },
};

export function parseMermaid(request: MermaidParseRequest): Promise<MermaidParseResult> {
  return mermaidSyntaxParser.parse(request);
}
