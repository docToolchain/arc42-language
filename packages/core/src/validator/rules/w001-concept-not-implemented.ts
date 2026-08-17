import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w001ConceptNotImplemented: Rule = {
  meta: {
    code: "W001",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Cross-cutting concept has no implementing building-block",
      rationale: "A concept defined in arc42 section 8 only has value if at least one building-block explicitly implements it. An orphaned concept — declared but never referenced by any building-block via 'implements:' — is either dead documentation or a gap: the concern exists but nobody is responsible for it.",
      arc42Chapter: 8,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "concept") continue;
      const implementors = (index.refsTo.get(el.id) ?? []).filter((id) => {
        return index.byId.get(id)?.kind === "building-block";
      });
      if (implementors.length === 0) {
        diagnostics.push({
          code: "W001",
          severity: "warning",
          message: `Concept '${el.id}' has no implementing building-block`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
