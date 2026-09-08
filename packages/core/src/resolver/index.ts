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

export function buildIndex(workspace: Workspace): ReferenceIndex {
  const byId = new Map<string, Element>();
  const refsFrom = new Map<string, string[]>();
  const refsTo = new Map<string, string[]>();
  const edges: Edge[] = [];

  // Populate byId
  for (const el of workspace.elements) {
    byId.set(el.id, el);
  }

  function addRef(fromId: string, toId: string) {
    const from = refsFrom.get(fromId) ?? [];
    from.push(toId);
    refsFrom.set(fromId, from);

    const to = refsTo.get(toId) ?? [];
    to.push(fromId);
    refsTo.set(toId, to);
  }

  for (const el of workspace.elements) {
    if (el.kind === "building-block") {
      if (el.parent) {
        edges.push({ from: el.id, to: el.parent, relation: "parent" });
        addRef(el.id, el.parent);
      }
      for (const ref of el.implements) {
        edges.push({ from: el.id, to: ref, relation: "implements" });
        addRef(el.id, ref);
      }
      // building-block requires → interface (consumer → interface)
      for (const ref of el.requires) {
        edges.push({ from: el.id, to: ref, relation: "requires" });
        addRef(el.id, ref);
      }
    } else if (el.kind === "actor") {
      // actor requires → interface (consumer → interface)
      for (const ref of el.requires) {
        edges.push({ from: el.id, to: ref, relation: "requires" });
        addRef(el.id, ref);
      }
    } else if (el.kind === "interface") {
      // building-block → interface (provider → provided interface)
      edges.push({ from: el.provider, to: el.id, relation: "provides" });
      addRef(el.provider, el.id);
    } else if (el.kind === "decision") {
      for (const ref of el.addresses) {
        edges.push({ from: el.id, to: ref, relation: "addresses" });
        addRef(el.id, ref);
      }
      if (el.supersedes) {
        edges.push({ from: el.id, to: el.supersedes, relation: "supersedes" });
        addRef(el.id, el.supersedes);
      }
    } else if (el.kind === "solution-strategy") {
      for (const ref of el.addresses) {
        edges.push({ from: el.id, to: ref, relation: "addresses" });
        addRef(el.id, ref);
      }
    } else if (el.kind === "runtime-scenario") {
      for (const ref of el.involves) {
        edges.push({ from: el.id, to: ref, relation: "involves" });
        addRef(el.id, ref);
      }
    } else if (el.kind === "deployment-node") {
      if (el.parent) {
        edges.push({ from: el.id, to: el.parent, relation: "parent" });
        addRef(el.id, el.parent);
      }
      for (const ref of el.hosts) {
        edges.push({ from: el.id, to: ref, relation: "hosts" });
        addRef(el.id, ref);
      }
    } else if (el.kind === "quality-scenario") {
      edges.push({ from: el.id, to: el.quality, relation: "elaborates" });
      addRef(el.id, el.quality);
    }
  }

  const interfaceEdges = deriveInterfaceEdges(workspace);

  return { byId, refsFrom, refsTo, edges, interfaceEdges };
}
