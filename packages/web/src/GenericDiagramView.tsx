import React from "react";
import type { GenericDiagramNode } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";

interface GenericDiagramViewProps {
  node: GenericDiagramNode;
}

export function GenericDiagramView({ node }: GenericDiagramViewProps) {
  return <MermaidDiagram source={node.source} id={node.id} />;
}
