// Meta-model element types

export interface SourceLocation {
  file: string;
  line: number;
}

export interface QualityGoal {
  kind: "quality-goal";
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  scenario?: string;
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
  loc: SourceLocation;
}

export type Element =
  | QualityGoal
  | BuildingBlock
  | Interface
  | Concept
  | Decision;

export interface ParseError {
  message: string;
  file: string;
  line: number;
}

export interface Workspace {
  elements: Element[];
  parseErrors: ParseError[];
}
