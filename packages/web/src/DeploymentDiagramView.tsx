import React, { useMemo } from "react";
import type { DeploymentDiagramNode, Element } from "./types";
import { MermaidDiagram } from "@cli42/lib/web-react";
import type { ElementLinks } from "@cli42/lib/web";

interface DeploymentDiagramViewProps {
  node: DeploymentDiagramNode;
  elementsMap: Map<string, Element>;
  links: ElementLinks;
}

export function DeploymentDiagramView({ node, elementsMap, links }: DeploymentDiagramViewProps) {
  const clickableNodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id] of elementsMap) {
      if (new RegExp(`\\b${id}\\b`).test(node.source)) {
        const href = links.elementHref(id);
        if (href) map.set(id, href);
      }
    }
    return map;
  }, [node.source, elementsMap, links]);

  return <MermaidDiagram source={node.source} id={node.id} clickableNodes={clickableNodes} />;
}
