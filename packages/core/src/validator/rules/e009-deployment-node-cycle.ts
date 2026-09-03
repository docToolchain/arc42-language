import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const e009DeploymentNodeCycle: Rule = {
  meta: {
    code: "E009",
    severity: "error",
    type: "problem",
    docs: {
      description: "Circular parent reference — deployment-node hierarchy must be acyclic",
      rationale:
        "Deployment-node parents define the infrastructure hierarchy. A cycle has no meaningful root and prevents the deployment topology from being navigated or rendered.",
      arc42Chapter: 7,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    for (const element of workspace.elements) {
      if (element.kind !== "deployment-node" || !element.parent) continue;

      const visited = new Set<string>();
      let current: string | undefined = element.id;
      while (current !== undefined) {
        if (visited.has(current)) {
          diagnostics.push({
            code: "E009",
            severity: "error",
            message: `Circular parent reference detected involving deployment-node '${current}'`,
            file: element.loc.file,
            line: element.loc.line,
          });
          break;
        }
        visited.add(current);
        const node = index.byId.get(current);
        current = node?.kind === "deployment-node" ? node.parent : undefined;
      }
    }
    return diagnostics;
  },
};
