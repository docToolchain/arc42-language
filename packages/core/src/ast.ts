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

export interface HeadingNode {
  kind: "heading";
  level: number;
  text: string;
  line: number;
}

export interface ProseNode {
  kind: "prose";
  text: string;
  line: number;
}

export interface BlockNode {
  kind: "block";
  blockType: string; // raw string — builder rejects unknowns
  attributes: Record<string, string>;
  startLine: number;
  endLine: number;
  /** True when the block was parsed inside a ```arc42 ... ``` wrapper fence. */
  inArc42Fence: boolean;
}

/** Common parser representation for any diagram artifact. */
export interface DiagramNodeBase {
  kind: "diagram";
  id: string;
  notation: string;
  /** Raw aliases string; the owning rule owns key-value parsing and diagnostics. */
  aliases: string;
  source: string;
  startLine: number;
  endLine: number;
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
  startLine: number;
  endLine: number;
}

/** Ignore directive: `:::ignore RULE [reason] :::` inside an ```arc42 fence.
 * This is a parser-level node that is consumed by the builder and validator.
 */
export interface IgnoreNode {
  kind: "ignore";
  ruleCode: string;
  reason?: string;
  startLine: number;
  endLine: number;
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
