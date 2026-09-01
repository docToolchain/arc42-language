import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e002UnresolvedReference: Rule = {
  meta: {
    code: "E002",
    severity: "error",
    type: "problem",
    docs: {
      description: "Unresolved reference — all referenced ids must exist in the workspace",
      rationale:
        "A reference to a non-existent id is a broken link. It means the architecture model is internally inconsistent — a building-block claims to implement a concept that was never defined, or a decision addresses a quality goal that does not exist. These broken links prevent graph traversal and make the model untrustworthy.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      const refs = index.refsFrom.get(el.id) ?? [];
      for (const ref of refs) {
        const target = index.byId.get(ref);
        const invalidRuntimeTarget =
          el.kind === "runtime-scenario" &&
          target !== undefined &&
          target.kind !== "building-block";
        if (!target || invalidRuntimeTarget) {
          diagnostics.push({
            code: "E002",
            severity: "error",
            message: invalidRuntimeTarget
              ? `Invalid involves reference '${ref}' in runtime scenario '${el.id}' — target must be a building-block`
              : `Unresolved reference '${ref}' in element '${el.id}'`,
            file: el.loc.file,
            line: el.loc.line,
          });
        }
      }
    }
    return diagnostics;
  },
};
