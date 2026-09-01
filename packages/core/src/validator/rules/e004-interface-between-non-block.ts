import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e004InterfaceBetweenNonBlock: Rule = {
  meta: {
    code: "E004",
    severity: "error",
    type: "problem",
    docs: {
      description: "interface.between must reference building-blocks or actors",
      rationale: "An interface models a communication channel. One end must always be a building-block. The other end may be a building-block (internal interface) or an actor (context-level interface, chapter 3). Referencing any other element type — quality-goal, concept, decision, etc. — is a category error. Actor-to-actor interfaces are also invalid: the system under description must participate in every interface.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const el of workspace.elements) {
      if (el.kind !== "interface") continue;

      const [idA, idB] = el.between;
      const a = index.byId.get(idA);
      const b = index.byId.get(idB);

      // Only validate when both ends are resolved — E002 covers unresolved refs
      if (!a || !b) continue;

      const aIsBlock = a.kind === "building-block";
      const bIsBlock = b.kind === "building-block";
      const aIsActor = a.kind === "actor";
      const bIsActor = b.kind === "actor";

      // Valid: building-block ↔ building-block
      if (aIsBlock && bIsBlock) continue;
      // Valid: building-block ↔ actor (either direction)
      if ((aIsBlock && bIsActor) || (aIsActor && bIsBlock)) continue;

      // Invalid: actor ↔ actor — the system must participate in every interface
      if (aIsActor && bIsActor) {
        diagnostics.push({
          code: "E004",
          severity: "error",
          message: `interface '${el.id}' connects two actors ('${idA}' and '${idB}') — an interface must involve a building-block on at least one side`,
          file: el.loc.file,
          line: el.loc.line,
        });
        continue;
      }

      // Invalid: any other non-building-block, non-actor end
      if (!aIsBlock && !aIsActor) {
        diagnostics.push({
          code: "E004",
          severity: "error",
          message: `interface '${el.id}' references '${idA}' which is not a building-block or actor (is '${a.kind}')`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
      if (!bIsBlock && !bIsActor) {
        diagnostics.push({
          code: "E004",
          severity: "error",
          message: `interface '${el.id}' references '${idB}' which is not a building-block or actor (is '${b.kind}')`,
          file: el.loc.file,
          line: el.loc.line,
        });
      }
    }
    return diagnostics;
  },
};
