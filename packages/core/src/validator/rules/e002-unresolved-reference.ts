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
      if (el.kind === "deployment-node") {
        const references: Array<{
          id: string;
          expected: "building-block" | "deployment-node";
        }> = [];
        if (el.parent) references.push({ id: el.parent, expected: "deployment-node" });
        for (const host of el.hosts) references.push({ id: host, expected: "building-block" });

        for (const reference of references) {
          const target = index.byId.get(reference.id);
          if (!target || target.kind !== reference.expected) {
            diagnostics.push({
              code: "E002",
              severity: "error",
              message: target
                ? `Invalid deployment reference '${reference.id}' in deployment node '${el.id}' — target must be a ${reference.expected}`
                : `Unresolved reference '${reference.id}' in element '${el.id}'`,
              file: el.loc.file,
              line: el.loc.line,
            });
          }
        }
        continue;
      }

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
