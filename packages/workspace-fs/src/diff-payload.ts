import { buildDiffView, lintArchitectureDiff } from "@arc42/core";
import type { DiffFinding, DiffPayload, DiffResult } from "@arc42/core";

import { loadDiffSnapshots } from "./diff-snapshots.ts";
import type { DiffSnapshots, DiffSpec } from "./diff-snapshots.ts";

export interface LoadedDiff {
  snapshots: DiffSnapshots;
  result: DiffResult;
  /** All findings, warnings first — the order `arc42 diff` prints them in. */
  findings: DiffFinding[];
  payload: DiffPayload;
}

/** Load both snapshots of a change, lint it and build its render-ready view. */
export async function loadDiffPayload(dir: string, spec: DiffSpec): Promise<LoadedDiff> {
  const snapshots = await loadDiffSnapshots(dir, spec);
  const result = lintArchitectureDiff({
    changedFiles: snapshots.changedFiles,
    base: snapshots.base.payload,
    head: snapshots.head.payload,
    baseKnownPaths: snapshots.base.knownPaths,
    headKnownPaths: snapshots.head.knownPaths,
  });
  const findings = [
    ...result.consistencyFindings,
    ...result.pathFindings,
    ...result.coverageFindings,
  ].sort(
    (a, b) =>
      Number(b.severity === "warning") - Number(a.severity === "warning") ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.kind.localeCompare(b.kind),
  );
  return {
    snapshots,
    result,
    findings,
    payload: {
      base: { label: snapshots.base.label, commit: snapshots.baseCommit },
      head: { label: snapshots.head.label },
      findings,
      groups: result.groups,
      view: buildDiffView(snapshots.base.payload, snapshots.head.payload, result.architecture),
    },
  };
}
