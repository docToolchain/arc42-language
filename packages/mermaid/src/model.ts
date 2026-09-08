/** Mermaid notation understood by the arc42 syntax boundary. */
export type MermaidNotation = "architecture" | "sequence" | "flowchart" | "class" | "auto";

export interface MermaidParseRequest {
  notation: MermaidNotation;
  source: string;
}

export interface MermaidParseSuccess {
  ok: true;
  notation: MermaidNotation;
  /** The diagram type selected by Mermaid's parser. */
  diagramType: string;
}

export interface MermaidParseFailure {
  ok: false;
  notation: MermaidNotation;
  message: string;
}

export type MermaidParseResult = MermaidParseSuccess | MermaidParseFailure;

/** Stable parser boundary consumed by arc42 semantic validators. */
export interface MermaidSyntaxParser {
  parse(request: MermaidParseRequest): Promise<MermaidParseResult>;
}
