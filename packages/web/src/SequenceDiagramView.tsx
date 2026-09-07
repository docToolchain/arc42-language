import React from "react";
import type { SequenceDiagramNode } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";

interface SequenceDiagramViewProps {
  node: SequenceDiagramNode;
}

export function SequenceDiagramView({ node }: SequenceDiagramViewProps) {
  return <MermaidDiagram source={node.source} id={node.id} />;
}
