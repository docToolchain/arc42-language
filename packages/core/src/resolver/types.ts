// Reference index produced by the resolver

import type { Element } from "../model/types.ts";

/** A graph edge connecting two elements */
export interface Edge {
  from: string;
  to: string;
  /** The semantic relationship type */
  relation:
    | "implements"
    | "parent"
    | "provides"
    | "requires"
    | "addresses"
    | "supersedes"
    | "involves"
    | "hosts"
    | "elaborates";
}

/** Derived consumer-to-provider relationship from interface requirements */
export interface DirectedInterfaceEdge {
  consumer: string;
  provider: string;
  interface: string;
}

export interface ReferenceIndex {
  /** id → element */
  byId: Map<string, Element>;
  /** id → list of ids this element references */
  refsFrom: Map<string, string[]>;
  /** id → list of ids that reference this element */
  refsTo: Map<string, string[]>;
  /** All reference edges in the workspace */
  edges: Edge[];
  /** Derived consumer→provider edges (from requires + provider fields) */
  interfaceEdges: DirectedInterfaceEdge[];
}
