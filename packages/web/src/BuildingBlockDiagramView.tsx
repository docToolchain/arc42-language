import React, { useMemo } from "react";
import type { BuildingBlockDiagramNode, Interface, Element } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";
import { resolveInterfaceLabels } from "./AstNodeRenderer";

interface BuildingBlockDiagramViewProps {
  node: BuildingBlockDiagramNode;
  interfaceMap: Map<string, Interface>;
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
}

export function BuildingBlockDiagramView({
  node,
  interfaceMap,
  elementsMap,
  elementDocMap,
}: BuildingBlockDiagramViewProps) {
  const source = useMemo(
    () => resolveInterfaceLabels(node.source, interfaceMap),
    [node.source, interfaceMap],
  );

  const clickableNodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id] of elementsMap) {
      // Check if this element ID appears as a word-boundary token in the source
      if (new RegExp(`\\b${id}\\b`).test(source)) {
        const docFile = elementDocMap.get(id);
        if (docFile) map.set(id, `#${docFile}:el-${id}`);
      }
    }
    return map;
  }, [source, elementsMap, elementDocMap]);

  return <MermaidDiagram source={source} id={node.id} clickableNodes={clickableNodes} />;
}
