import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e006SupersededDecisionNoSupersedes: Rule = {
  meta: {
    code: "E006",
    severity: "error",
    type: "problem",
    docs: {
      description: "Decision carries 'supersedes' but the referenced decision does not have status 'superseded'",
      rationale: "In standard ADR practice the *new* decision declares what it replaces via the 'supersedes' field, and the *old* decision's status is changed to 'superseded'. If a decision has 'supersedes' pointing to another decision but that other decision is not marked 'superseded', the replacement chain is incomplete and readers cannot trust the decision history.",
      arc42Chapter: 9,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    // Index decisions by id for fast lookup
    const decisionsById = new Map(
      workspace.elements
        .filter((el) => el.kind === "decision")
        .map((el) => [el.id, el]),
    );
    for (const el of workspace.elements) {
      if (el.kind !== "decision" || !el.supersedes) continue;
      const old = decisionsById.get(el.supersedes);
      if (old && old.kind === "decision" && old.status !== "superseded") {
        diagnostics.push({
          code: "E006",
          severity: "error",
          message: `Decision '${el.id}' supersedes '${el.supersedes}' but that decision does not have status 'superseded'`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
