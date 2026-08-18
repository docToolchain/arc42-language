import type { Workspace, Element } from "../model/types.ts";
import type { ReferenceIndex } from "./types.ts";

export function buildIndex(workspace: Workspace): ReferenceIndex {
  const byId = new Map<string, Element>();
  const refsFrom = new Map<string, string[]>();
  const refsTo = new Map<string, string[]>();

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
      if (el.parent) addRef(el.id, el.parent);
      for (const ref of el.implements) addRef(el.id, ref);
    } else if (el.kind === "interface") {
      addRef(el.id, el.between[0]);
      addRef(el.id, el.between[1]);
    } else if (el.kind === "decision") {
      for (const ref of el.addresses) addRef(el.id, ref);
      if (el.supersedes) addRef(el.id, el.supersedes);
    }
  }

  return { byId, refsFrom, refsTo };
}
