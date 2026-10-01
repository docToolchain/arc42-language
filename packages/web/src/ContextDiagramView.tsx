import React, { useMemo } from "react";
import type { ContextDiagramNode, Interface, Element } from "./types";
import { MermaidDiagram } from "@cli42/lib/web-react";
import { resolveInterfaceLabels } from "./AstNodeRenderer";
import type { ElementLinks } from "@cli42/lib/web";

interface ContextDiagramViewProps {
  node: ContextDiagramNode;
  interfaceMap: Map<string, Interface>;
  elementsMap: Map<string, Element>;
  links: ElementLinks;
}

export function ContextDiagramView({
  node,
  interfaceMap,
  elementsMap,
  links,
}: ContextDiagramViewProps) {
  const source = useMemo(
    () => resolveInterfaceLabels(node.source, interfaceMap),
    [node.source, interfaceMap],
  );

  const clickableNodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id] of elementsMap) {
      if (new RegExp(`\\b${id}\\b`).test(source)) {
        const href = links.elementHref(id);
        if (href) map.set(id, href);
      }
    }
    return map;
  }, [source, elementsMap, links]);

  return <MermaidDiagram source={source} id={node.id} clickableNodes={clickableNodes} />;
}
