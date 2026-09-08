import type { Workspace, Element } from "../model/types.ts";
import type { ReferenceIndex, Edge } from "./types.ts";

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
    } else if (el.kind === "interface") {
      edges.push({ from: el.id, to: el.between[0], relation: "between" });
      edges.push({ from: el.id, to: el.between[1], relation: "between" });
      addRef(el.id, el.between[0]);
      addRef(el.id, el.between[1]);
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

  return { byId, refsFrom, refsTo, edges };
}
