import React, { useMemo } from "react";
import type { BuildingBlockDiagramNode, Interface, Element } from "./types";
import { MermaidDiagram } from "@cli42/lib/web-react";
import { resolveInterfaceLabels } from "./AstNodeRenderer";
import type { ElementLinks } from "@cli42/lib/web";

interface BuildingBlockDiagramViewProps {
  node: BuildingBlockDiagramNode;
  interfaceMap: Map<string, Interface>;
  elementsMap: Map<string, Element>;
  links: ElementLinks;
}

export function BuildingBlockDiagramView({
  node,
  interfaceMap,
  elementsMap,
  links,
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
        const href = links.elementHref(id);
        if (href) map.set(id, href);
      }
    }
    return map;
  }, [source, elementsMap, links]);

  return <MermaidDiagram source={source} id={node.id} clickableNodes={clickableNodes} />;
}
