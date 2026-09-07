import React, { useMemo } from "react";
import type { BuildingBlockDiagramNode, Interface } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";
import { resolveInterfaceLabels } from "./AstNodeRenderer";

interface BuildingBlockDiagramViewProps {
  node: BuildingBlockDiagramNode;
  interfaceMap: Map<string, Interface>;
}

export function BuildingBlockDiagramView({ node, interfaceMap }: BuildingBlockDiagramViewProps) {
  const source = useMemo(
    () => resolveInterfaceLabels(node.source, interfaceMap),
    [node.source, interfaceMap],
  );
  return <MermaidDiagram source={source} id={node.id} />;
}
