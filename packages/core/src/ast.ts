// AST types produced by the parser

export type BlockType =
  | "quality-goal"
  | "quality-scenario"
  | "constraint"
  | "actor"
  | "solution-strategy"
  | "building-block"
  | "deployment-node"
  | "interface"
  | "concept"
  | "decision"
  | "risk"
  | "glossary-term"
  | "runtime-scenario";

/**
 * Half-open source range (start inclusive, end exclusive).
 *Offsets are zero-based character positions in the document content.
 */
export interface SourceRange {
  start: number; // inclusive
  end: number; // exclusive
}

/**
 * Zero-based line/character position.
 */
export interface Position {
  line: number;
  character: number;
}

/**
 * One-based line/character position (used by parser for compatibility).
 */
export interface ParserPosition {
  line: number; // one-based
  character: number; // one-based (character index, 1-indexed)
}

export interface HeadingNode {
  kind: "heading";
  level: number;
  text: string;
  line: number; // one-based
  /** Zero-based character offset of line start (optional for backward compatibility) */
  startOffset?: number;
  /** Zero-based character offset of line end (optional for backward compatibility) */
  endOffset?: number;
  /** Half-open range for the heading line (optional for backward compatibility) */
  range?: SourceRange;
}

export interface ProseNode {
  kind: "prose";
  text: string;
  line: number; // one-based
  /** Zero-based character offset of line start (optional for backward compatibility) */
  startOffset?: number;
  /** Zero-based character offset of line end (optional for backward compatibility) */
  endOffset?: number;
  /** Half-open range for the prose line (optional for backward compatibility) */
  range?: SourceRange;
}

export interface BlockNode {
  kind: "block";
  blockType: string; // raw string — builder rejects unknowns
  attributes: Record<string, string>;
  startLine: number; // one-based
  endLine: number; // one-based
  /** Zero-based character offset of block start (optional for backward compatibility) */
  startOffset?: number;
  /** Zero-based character offset of block end (after closing ::::) (optional for backward compatibility) */
  endOffset?: number;
  /** Half-open range for the entire block (optional for backward compatibility) */
  range?: SourceRange;
  /** True when the block was parsed inside a ```arc42 ... ``` wrapper fence. */
  inArc42Fence: boolean;
}

export interface DiagramNodeBase {
  kind: "diagram";
  id: string;
  notation: string;
  /** Raw aliases string; the owning rule owns key-value parsing and diagnostics. */
  aliases: string;
  source: string;
  startLine: number; // one-based
  endLine: number; // one-based
  /** Zero-based character offset of diagram start (optional for backward compatibility) */
  startOffset?: number;
  /** Zero-based character offset of diagram end (optional for backward compatibility) */
  endOffset?: number;
  /** Half-open range for the entire diagram (optional for backward compatibility) */
  range?: SourceRange;
}

/** Generic diagram syntax whose notation is handled by a future adapter. */
export interface GenericDiagramNode extends DiagramNodeBase {
  diagramType: "generic";
}

/** Mermaid sequence diagram metadata explicitly owned by a Runtime View scenario. */
export interface SequenceDiagramNode extends DiagramNodeBase {
  diagramType: "sequence";
  notation: "mermaid-sequence";
  scenario: string;
}

/** Deployment View diagram metadata; source semantics are validated by E010 adapters. */
export interface DeploymentDiagramNode extends DiagramNodeBase {
  diagramType: "deployment";
  view: "deployment";
  roots: string[];
}

/** Building Block View diagram — source is author/agent-written Mermaid; validated by H015/H016 adapters. */
export interface BuildingBlockDiagramNode extends DiagramNodeBase {
  diagramType: "building-block";
  view: "building-block";
  roots: string[];
}

/** System Context diagram — source is author/agent-written Mermaid; validated for coverage by W020. */
export interface ContextDiagramNode extends DiagramNodeBase {
  diagramType: "context";
  view: "context";
  roots: string[];
}

/** Bare mermaid fenced block with no preceding :::diagram metadata block.
 * The parser emits this when it encounters ```mermaid without a :::diagram owner.
 * Validator rule W017 warns about these — authors should add a :::diagram block.
 * The web renderer renders the source as-is since the Mermaid is still valid.
 */
export interface BareMermaidNode {
  kind: "bare-mermaid";
  source: string;
  startLine: number; // one-based
  endLine: number; // one-based
  /** Zero-based character offset of block start (optional for backward compatibility) */
  startOffset?: number;
  /** Zero-based character offset of block end (optional for backward compatibility) */
  endOffset?: number;
  /** Half-open range for the entire block (optional for backward compatibility) */
  range?: SourceRange;
}

/** Ignore directive: `:::ignore RULE [reason] :::` inside an ```arc42 fence.
 * This is a parser-level node that is consumed by the builder and validator.
 */
export interface IgnoreNode {
  kind: "ignore";
  ruleCode: string;
  reason?: string;
  startLine: number; // one-based
  endLine: number; // one-based
  /** Zero-based character offset of directive start (optional for backward compatibility) */
  startOffset?: number;
  /** Zero-based character offset of directive end (optional for backward compatibility) */
  endOffset?: number;
  /** Half-open range for the entire directive (optional for backward compatibility) */
  range?: SourceRange;
}

export type DiagramNode =
  | GenericDiagramNode
  | SequenceDiagramNode
  | DeploymentDiagramNode
  | BuildingBlockDiagramNode
  | ContextDiagramNode;

export type AstNode =
  | HeadingNode
  | ProseNode
  | BlockNode
  | DiagramNode
  | BareMermaidNode
  | IgnoreNode;

export interface DocumentAst {
  filePath: string;
  nodes: AstNode[];
}
