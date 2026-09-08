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
    | "between"
    | "addresses"
    | "supersedes"
    | "involves"
    | "hosts"
    | "elaborates";
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
}
