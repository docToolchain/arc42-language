// AST types produced by the parser

export type BlockType =
  | "quality-goal"
  | "constraint"
  | "actor"
  | "building-block"
  | "interface"
  | "concept"
  | "decision"
  | "risk"
  | "glossary-term";

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
}

export type AstNode = HeadingNode | ProseNode | BlockNode;

export interface DocumentAst {
  filePath: string;
  nodes: AstNode[];
}
