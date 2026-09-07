import React, { useMemo } from "react";
import type { ContextDiagramNode, Interface } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";
import { resolveInterfaceLabels } from "./AstNodeRenderer";

interface ContextDiagramViewProps {
  node: ContextDiagramNode;
  interfaceMap: Map<string, Interface>;
}

export function ContextDiagramView({ node, interfaceMap }: ContextDiagramViewProps) {
  const source = useMemo(
    () => resolveInterfaceLabels(node.source, interfaceMap),
    [node.source, interfaceMap],
  );
  return <MermaidDiagram source={source} id={node.id} />;
}
