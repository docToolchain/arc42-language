import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h005ConceptsNeverImplemented: Rule = {
  meta: {
    code: "H005",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Workspace has concepts but no building block uses 'implements'",
      rationale:
        "Cross-cutting concepts in arc42 chapter 8 are only useful if they are applied consistently. The 'implements' attribute on building blocks makes concept coverage explicit and machine-verifiable. If no building block implements any concept, the concepts are floating abstractions — they may describe intent but provide no traceability to which parts of the system actually apply them.",
      arc42Chapter: 8,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const concepts = workspace.elements.filter((el) => el.kind === "concept");
    if (concepts.length === 0) return [];

    const anyImplements = workspace.elements.some(
      (el) => el.kind === "building-block" && el.implements.length > 0,
    );
    if (anyImplements) return [];

    return [
      {
        code: "H005",
        severity: "hint",
        message: `Workspace has ${concepts.length} concept(s) but no building block uses 'implements:' — cross-cutting concepts should be referenced from building blocks (chapter 8)`,
        file: concepts[0]!.loc.file,
        line: concepts[0]!.loc.line,
      },
    ];
  },
};
