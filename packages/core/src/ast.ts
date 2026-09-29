// AST types produced by the parser: the node types of the shared Markdown
// notation, with arc42's blocks and diagrams.

import type {
  BareMermaidNode,
  HeadingNode,
  IgnoreNode,
  MarkdownBlockNode,
  ProseNode,
} from "@cli42/lib/parser";

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

export type { BareMermaidNode, HeadingNode, IgnoreNode, ProseNode };

export interface BlockNode extends MarkdownBlockNode {
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
