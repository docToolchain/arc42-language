import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const h004BuildingBlockUnreferencedByInterface: Rule = {
  meta: {
    code: "H004",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Building block is not referenced by any interface",
      rationale:
        "A building block with no interface connecting it to the rest of the system is an island — it either has no collaborators or its collaborations are undocumented. arc42 chapter 5 expects interfaces to make collaboration explicit and verifiable. Leaf blocks (those with a parent) are excluded because they may deliberately have no direct interfaces at the root level. A root block whose parts have interfaces while it has none is still reported: its black box shows no collaboration at level 1, and whoever uses those interfaces reaches into its internals — the interface belongs on the black box, realized by the part.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const blocks = workspace.elements.filter(
      (e): e is BuildingBlock => e.kind === "building-block",
    );
    const hasInterface = (id: string) =>
      workspace.elements.some(
        (candidate) => candidate.kind === "interface" && candidate.provider === id,
      ) || index.interfaceEdges.some((edge) => edge.consumer === id || edge.provider === id);
    for (const el of blocks) {
      // Leaf blocks (those inside a parent) are excluded to avoid false positives
      if (el.parent) continue;
      if (hasInterface(el.id)) continue;
      const nested = nestedInterfaces(el.id, blocks, workspace);
      diagnostics.push({
        code: "H004",
        severity: "hint",
        message:
          nested.length > 0
            ? `Building block '${el.id}' has no interface of its own, but its parts have: ${describe(nested)} — model the interface on '${el.id}' as its black-box interface, realized by the part, so level 1 shows how it collaborates (chapter 5)`
            : `Building block '${el.id}' is not referenced by any interface — consider connecting it or removing it (chapter 5)`,
        file: el.loc.file,
        line: el.loc.line,
      });
    }
    return diagnostics;
  },
};

interface NestedInterface {
  id: string;
  part: string;
  role: "provided" | "required";
}

/** Interfaces that blocks nested in `rootId` (at any depth) provide or require. */
function nestedInterfaces(
  rootId: string,
  blocks: readonly BuildingBlock[],
  workspace: Workspace,
): NestedInterface[] {
  const parts = new Set<string>();
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = blocks
      .filter((block) => block.parent && frontier.includes(block.parent) && !parts.has(block.id))
      .map((block) => block.id);
    for (const child of children) parts.add(child);
    frontier = children;
  }
  const found: NestedInterface[] = [];
  for (const element of workspace.elements) {
    if (element.kind === "interface" && parts.has(element.provider)) {
      found.push({ id: element.id, part: element.provider, role: "provided" });
    }
  }
  for (const block of blocks) {
    if (!parts.has(block.id)) continue;
    for (const id of block.requires) found.push({ id, part: block.id, role: "required" });
  }
  return found;
}

/** "if-a (provided by bb-x), if-b (required by bb-y)", at most three. */
function describe(nested: readonly NestedInterface[]): string {
  const shown = nested
    .slice(0, 3)
    .map(({ id, part, role }) => `${id} (${role} by ${part})`)
    .join(", ");
  return nested.length > 3 ? `${shown}, and ${nested.length - 3} more` : shown;
}
