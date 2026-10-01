import React from "react";
import { ChangeGroup, ChangeLinkTo, scope } from "@cli42/lib/web-react";
import type { ChangeExtensions, ChangeLink } from "@cli42/lib/web-react";
import type { DiffPayload, ElementCodeChange } from "./types";

const styles = scope("changes");

function CodeChanges({
  changes,
  elementLink,
}: {
  changes: ElementCodeChange[];
  elementLink: (elementId: string) => ChangeLink | null;
}) {
  return (
    <ul role="list">
      {changes.map((change) => (
        <li key={change.elementId} data-testid="code-change" data-element={change.elementId}>
          <ChangeLinkTo link={elementLink(change.elementId)}>
            <code>{change.elementId}</code>
          </ChangeLinkTo>
          <span className={styles.files}>
            {change.files.map((file) => (
              <code key={file}>{file}</code>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * arc42's part of the change summary: its warnings, and how the change
 * relates to the code (elements whose code changed, paths no block covers).
 */
export const arc42ChangeExtensions: ChangeExtensions<DiffPayload> = {
  warnings: (diff) => diff.groups.warnings,
  attention: (diff, elementLink) => {
    const { untouched, updated, uncovered } = diff.groups;
    return (
      <>
        {untouched.length > 0 && (
          <ChangeGroup
            title="Code changed, architecture untouched"
            hint="Do these elements still describe the code?"
            testId="diff-untouched"
          >
            <CodeChanges changes={untouched} elementLink={elementLink} />
          </ChangeGroup>
        )}
        {uncovered.length > 0 && (
          <ChangeGroup title="Not covered by any building block" testId="diff-uncovered">
            <ul role="list">
              {uncovered.map((path) => (
                <li key={path}>
                  <code>{path}</code>
                </li>
              ))}
            </ul>
          </ChangeGroup>
        )}
        {updated.length > 0 && (
          <ChangeGroup
            title={`Code changed, element also updated in this change (${updated.length})`}
            testId="diff-updated"
            collapsed
          >
            <CodeChanges changes={updated} elementLink={elementLink} />
          </ChangeGroup>
        )}
      </>
    );
  },
};
