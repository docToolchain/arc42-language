// Reference index produced by the resolver

import type { Element } from "../model/types.ts";

export interface ReferenceIndex {
  /** id → element */
  byId: Map<string, Element>;
  /** id → list of ids this element references */
  refsFrom: Map<string, string[]>;
  /** id → list of ids that reference this element */
  refsTo: Map<string, string[]>;
}
