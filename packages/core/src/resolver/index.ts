import { buildIndex as buildReferenceIndex } from "@cli42/lib/model";
import { ELEMENT_SCHEMAS } from "../model/schemas.ts";
import type { Workspace, Element } from "../model/types.ts";
import type { ReferenceIndex, Edge, DirectedInterfaceEdge } from "./types.ts";

/**
 * Derive consumer→provider interface edges from the model.
 *
 * This helper is the single source of truth for the directed interface relationship
 * (which element requires which interface, and who provides it). It is used by
 * validators and renderers instead of duplicating the join logic.
 *
 * Rules:
 * - Each interface has one provider (building-block via interface.provider)
 * - Each actor/building-block requirement creates a consumer→interface relationship
 * - The derived edge is consumer → provider via the interface
 *
 * The result may contain multiple edges for the same interface if it has multiple consumers.
 * Actor consumers are allowed; the provider must be a building block.
 */
export function deriveInterfaceEdges(workspace: Workspace): DirectedInterfaceEdge[] {
  const edges: DirectedInterfaceEdge[] = [];
  const interfaceById = new Map<string, Extract<Element, { kind: "interface" }>>();

  for (const el of workspace.elements) {
    if (el.kind === "interface") {
      interfaceById.set(el.id, el);
    }
  }

  for (const el of workspace.elements) {
    // Actors require interfaces (at least one, enforced by schema)
    if (el.kind === "actor") {
      for (const ifaceId of el.requires) {
        const iface = interfaceById.get(ifaceId);
        if (iface) edges.push({ consumer: el.id, provider: iface.provider, interface: ifaceId });
      }
    }

    // Building blocks may require interfaces
    if (el.kind === "building-block") {
      for (const ifaceId of el.requires) {
        const iface = interfaceById.get(ifaceId);
        if (iface) edges.push({ consumer: el.id, provider: iface.provider, interface: ifaceId });
      }
    }
  }

  return edges;
}

/**
 * Index the references between elements. The edges come from the
 * cross-references the schemas declare (see ELEMENT_SCHEMAS); the derived
 * consumer → provider interface edges are added.
 */
export function buildIndex(workspace: Workspace): ReferenceIndex {
  const index = buildReferenceIndex<Element, Edge["relation"]>(workspace.elements, ELEMENT_SCHEMAS);
  return { ...index, interfaceEdges: deriveInterfaceEdges(workspace) };
}
