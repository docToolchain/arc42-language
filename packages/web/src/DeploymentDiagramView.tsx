import React from "react";
import type { DeploymentDiagramNode } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";

interface DeploymentDiagramViewProps {
  node: DeploymentDiagramNode;
}

export function DeploymentDiagramView({ node }: DeploymentDiagramViewProps) {
  return <MermaidDiagram source={node.source} id={node.id} />;
}
