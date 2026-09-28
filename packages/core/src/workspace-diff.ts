/**
 * Semantic architecture diff between two workspace snapshots — the generic
 * workspace diff of `@cli42/lib`, typed with the arc42 model.
 *
 * A block must be placed under a heading (E017), so a document preamble never
 * holds elements.
 */

import { diffWorkspaces as diffSnapshots } from "@cli42/lib/diff";
import type {
  DiffOptions,
  EdgeChange as GenericEdgeChange,
  ElementChange as GenericElementChange,
  WorkspaceDiff,
} from "@cli42/lib/diff";
import type { WorkspacePayload } from "./workspace.ts";

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
export const DIFF_OPTIONS: DiffOptions = { preambleBlockRule: "E017" };

export function diffWorkspaces(base: WorkspacePayload, head: WorkspacePayload): ArchitectureDiff {
  return diffSnapshots(base, head, DIFF_OPTIONS);
}
