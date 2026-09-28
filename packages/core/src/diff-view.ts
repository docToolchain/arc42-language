/**
 * Render-ready view of an architecture diff: the changed sections ("segments")
 * of both snapshots with their AST nodes (prose already rendered), the
 * elements they define or mention, and the edges between them — the generic
 * diff view of `@cli42/lib`, typed with the arc42 model.
 */

import { buildDiffView as buildView } from "@cli42/lib/diff";
import type {
  DiffDocument as GenericDiffDocument,
  DiffSegment as GenericDiffSegment,
  DiffView as GenericDiffView,
  SectionContent as GenericSectionContent,
} from "@cli42/lib/diff";
import type { DiffFinding, FindingGroups } from "./diff.ts";
import type { WorkspacePayload } from "./workspace.ts";
import { DIFF_OPTIONS, diffWorkspaces } from "./workspace-diff.ts";
import type { ArchitectureDiff } from "./workspace-diff.ts";

export type { OutlineEntry } from "@cli42/lib/diff";

export type SectionContent = GenericSectionContent<WorkspacePayload>;
export type DiffSegment = GenericDiffSegment<WorkspacePayload>;
export type DiffDocument = GenericDiffDocument<WorkspacePayload>;
export type DiffView = GenericDiffView<WorkspacePayload>;

/** One visualized difference: the lint findings and the render-ready view of the change. */
export interface DiffPayload {
  base: { label: string; commit: string };
  head: { label: string };
  /**
   * Documents of the workspace that Git does not track yet: present in the
   * working tree, but not part of the comparison until added.
   */
  untracked?: string[];
  /** Lint findings, warnings first (same order as `arc42 diff`). */
  findings: DiffFinding[];
  /** The same findings grouped for a reviewer. */
  groups: FindingGroups;
  view: DiffView;
}

/**
 * Build the render-ready view of the change from `base` to `head`. Pass the
 * `diff` when it was already computed for the same snapshots.
 */
export function buildDiffView(
  base: WorkspacePayload,
  head: WorkspacePayload,
  diff: ArchitectureDiff = diffWorkspaces(base, head),
): DiffView {
  return buildView(base, head, diff, DIFF_OPTIONS);
}
