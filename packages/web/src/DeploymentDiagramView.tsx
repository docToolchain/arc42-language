import React, { useMemo } from "react";
import type { DeploymentDiagramNode, Element } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";

interface DeploymentDiagramViewProps {
  node: DeploymentDiagramNode;
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
}

export function DeploymentDiagramView({
  node,
  elementsMap,
  elementDocMap,
}: DeploymentDiagramViewProps) {
  const clickableNodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id] of elementsMap) {
      if (new RegExp(`\\b${id}\\b`).test(node.source)) {
        const docFile = elementDocMap.get(id);
        if (docFile) map.set(id, `#${docFile}:el-${id}`);
      }
    }
    return map;
  }, [node.source, elementsMap, elementDocMap]);

  return <MermaidDiagram source={node.source} id={node.id} clickableNodes={clickableNodes} />;
}
