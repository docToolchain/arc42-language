import React, { useMemo } from "react";
import type { ContextDiagramNode, Interface, Element } from "./types";
import { MermaidDiagram } from "./MermaidDiagram";
import { resolveInterfaceLabels } from "./AstNodeRenderer";

interface ContextDiagramViewProps {
  node: ContextDiagramNode;
  interfaceMap: Map<string, Interface>;
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
}

export function ContextDiagramView({
  node,
  interfaceMap,
  elementsMap,
  elementDocMap,
}: ContextDiagramViewProps) {
  const source = useMemo(
    () => resolveInterfaceLabels(node.source, interfaceMap),
    [node.source, interfaceMap],
  );

  const clickableNodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id] of elementsMap) {
      if (new RegExp(`\\b${id}\\b`).test(source)) {
        const docFile = elementDocMap.get(id);
        if (docFile) map.set(id, `#${docFile}:el-${id}`);
      }
    }
    return map;
  }, [source, elementsMap, elementDocMap]);

  return <MermaidDiagram source={source} id={node.id} clickableNodes={clickableNodes} />;
}
