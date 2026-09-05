// Browser-side mirror of the WorkspacePayload and AST types from @arc42/core.
// These are kept in sync by hand — no direct import from the Node.js package.

// ─── AST ────────────────────────────────────────────────────────────────────

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
  blockType: string;
  attributes: Record<string, string>;
  startLine: number;
  endLine: number;
  inArc42Fence: boolean;
}

export interface DiagramNodeBase {
  kind: "diagram";
  id: string;
  notation: string;
  aliases: string;
  source: string;
  startLine: number;
  endLine: number;
}

export interface GenericDiagramNode extends DiagramNodeBase {
  diagramType: "generic";
}

export interface SequenceDiagramNode extends DiagramNodeBase {
  diagramType: "sequence";
  notation: "mermaid-sequence";
  scenario: string;
}

export interface DeploymentDiagramNode extends DiagramNodeBase {
  diagramType: "deployment";
  view: "deployment";
  roots: string[];
}

export type DiagramNode = GenericDiagramNode | SequenceDiagramNode | DeploymentDiagramNode;

/** Virtual node type created by DocumentView grouping — never from the server */
export interface ProseRunNode {
  kind: "prose-run";
  text: string;
  block: BlockNode | null;
}

export type AstNode = HeadingNode | ProseNode | BlockNode | DiagramNode | ProseRunNode;

export interface DocumentAst {
  filePath: string;
  nodes: AstNode[];
}

// ─── Model ──────────────────────────────────────────────────────────────────

export interface SourceLocation {
  file: string;
  line: number;
  heading?: string;
  prose?: string;
}

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

export interface QualityGoal {
  kind: "quality-goal";
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  scenario?: string;
  loc: SourceLocation;
}

export interface QualityScenario {
  kind: "quality-scenario";
  id: string;
  title: string;
  quality: string;
  stimulus?: string;
  response?: string;
  metric?: string;
  loc: SourceLocation;
}

export interface Actor {
  kind: "actor";
  id: string;
  title: string;
  type: "person" | "system";
  description?: string;
  loc: SourceLocation;
}

export interface SolutionStrategy {
  kind: "solution-strategy";
  id: string;
  title: string;
  addresses: string[];
  loc: SourceLocation;
}

export interface BuildingBlock {
  kind: "building-block";
  id: string;
  title: string;
  technology?: string;
  parent?: string;
  implements: string[];
  loc: SourceLocation;
}

export interface Interface {
  kind: "interface";
  id: string;
  title: string;
  between: [string, string];
  protocol?: string;
  loc: SourceLocation;
}

export interface RuntimeScenario {
  kind: "runtime-scenario";
  id: string;
  title: string;
  involves: string[];
  trigger?: string;
  loc: SourceLocation;
}

export interface DeploymentNode {
  kind: "deployment-node";
  id: string;
  title: string;
  type?: "server" | "container" | "device" | "cloud-region" | "environment";
  hosts: string[];
  parent?: string;
  loc: SourceLocation;
}

export interface Concept {
  kind: "concept";
  id: string;
  title: string;
  category?: string;
  loc: SourceLocation;
}

export interface Decision {
  kind: "decision";
  id: string;
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  date?: string;
  addresses: string[];
  supersedes?: string;
  loc: SourceLocation;
}

export interface Constraint {
  kind: "constraint";
  id: string;
  title: string;
  category: "technical" | "organizational" | "convention";
  source?: string;
  loc: SourceLocation;
}

export interface Risk {
  kind: "risk";
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  mitigation?: string;
  loc: SourceLocation;
}

export interface GlossaryTerm {
  kind: "glossary-term";
  id: string;
  title: string;
  definition: string;
  loc: SourceLocation;
}

export type Element =
  | QualityGoal
  | QualityScenario
  | Constraint
  | Actor
  | SolutionStrategy
  | BuildingBlock
  | Interface
  | RuntimeScenario
  | DeploymentNode
  | Concept
  | Decision
  | Risk
  | GlossaryTerm;

// ─── Edges ──────────────────────────────────────────────────────────────────

export interface Edge {
  from: string;
  to: string;
  relation: "implements" | "parent" | "between" | "addresses" | "involves" | "hosts" | "elaborates";
}

// ─── Diagram artifacts ───────────────────────────────────────────────────────

export interface Diagram {
  kind: "diagram";
  id: string;
  notation: string;
  source: string;
  aliases: string;
  loc: SourceLocation;
}

export interface GenericDiagram extends Diagram {
  diagramType: "generic";
}

export interface SequenceDiagram extends Diagram {
  diagramType: "sequence";
  notation: "mermaid-sequence";
  scenario: string;
}

export interface DeploymentDiagram extends Diagram {
  diagramType: "deployment";
  view: "deployment";
  roots: string[];
}

export type DiagramArtifact = GenericDiagram | SequenceDiagram | DeploymentDiagram;

// ─── Workspace payload ───────────────────────────────────────────────────────

export interface WorkspacePayload {
  elements: Element[];
  edges: Edge[];
  diagrams: DiagramArtifact[];
  documents: DocumentAst[];
}
