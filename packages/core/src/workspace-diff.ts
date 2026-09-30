/**
 * Semantic architecture diff between two workspace snapshots — the generic
 * workspace diff of `@cli42/lib`, typed with the arc42 model.
 *
 * A block must be placed under a heading (EG04), so a document preamble never
 * holds elements.
 */

import { diffWorkspaces as diffSnapshots } from "@cli42/lib/diff";
import { proseRelevanceOf } from "@cli42/lib/model";
import type {
  DiffOptions,
  EdgeChange as GenericEdgeChange,
  ElementChange as GenericElementChange,
  WorkspaceDiff,
} from "@cli42/lib/diff";
import type { WorkspacePayload } from "./workspace.ts";
import { ELEMENT_SCHEMAS } from "./model/schemas.ts";

export type {
  AttributeChange,
  ChangeStatus,
  DiagramChange,
  DocumentChangeSummary,
  Location,
  ProseSectionChange,
  SectionRef,
} from "@cli42/lib/diff";

export type ElementChange = GenericElementChange<WorkspacePayload>;
export type EdgeChange = GenericEdgeChange<WorkspacePayload>;
export type ArchitectureDiff = WorkspaceDiff<WorkspacePayload>;

/** @internal Shared with the diff view. */
export const DIFF_OPTIONS: DiffOptions = {
  rejectPreambleBlocks: true,
  // A prose-only change is a finding only when it names a fact of the block or
  // an element the model does not connect to it (docToolchain/arc42-language#90).
  proseRelevance: proseRelevanceOf(ELEMENT_SCHEMAS),
};

export function diffWorkspaces(base: WorkspacePayload, head: WorkspacePayload): ArchitectureDiff {
  return diffSnapshots(base, head, DIFF_OPTIONS);
}
