import type { Rule, Diagnostic } from "../types.ts";
import type { BuildingBlock, Interface, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

/**
 * H022 — A root building block is not reachable from any actor.
 *
 * Fires when a root building block (no `parent`) participates in the interface
 * graph (provides or consumes at least one interface) but cannot be reached from
 * any actor — either directly (actor requires an interface provided by this block)
 * or transitively (some reachable block requires an interface provided by this block).
 *
 * Blocks with no interface participation at all are excluded: H004 already covers that.
 * Child blocks (those with a `parent`) are excluded: internal decomposition is
 * not expected to have an independent actor entry point.
 * If no actors exist in the workspace the rule does not fire: H008 covers the
 * missing actor interface concern.
 *
 * Typical fix: introduce a new actor (e.g. `actor-visitor`) that requires an
 * interface provided by the unreachable block, making the stakeholder explicit.
 */
export const h022BuildingBlockNoActorPath: Rule = {
  meta: {
    code: "H022",
    severity: "hint",
    type: "suggestion",
    docs: {
      description: "Root building block is not reachable from any actor via the interface graph",
      rationale:
        "Every root building block should be reachable from at least one actor. A block that no actor can reach suggests an unmodeled external stakeholder — the system has a capability that nobody is shown to use. Introducing the missing actor makes the stakeholder and their entry point explicit in the architecture.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Collect root building blocks (no parent)
    const rootBlocks = workspace.elements.filter(
      (e): e is BuildingBlock => e.kind === "building-block" && !e.parent,
    );

    // If there are no actors the model is simply incomplete — not H022's concern
    const hasActors = workspace.elements.some((e) => e.kind === "actor");
    if (!hasActors) return diagnostics;

    // Pre-build adjacency map: consumer id → [provider id, ...] for O(V+E) BFS
    const consumerToProviders = new Map<string, string[]>();
    for (const edge of index.interfaceEdges) {
      let providers = consumerToProviders.get(edge.consumer);
      if (!providers) {
        providers = [];
        consumerToProviders.set(edge.consumer, providers);
      }
      providers.push(edge.provider);
    }

    // Build a set of provider ids reachable from any actor via interface edges.
    // Seed: all providers directly required by actors (using index.byId for O(1) lookup).
    // Expand: BFS through building-block requires chains using the adjacency map.
    const reachable = new Set<string>();
    const queue: string[] = [];

    for (const [consumerId, providers] of consumerToProviders) {
      const consumer = index.byId.get(consumerId);
      if (consumer?.kind === "actor") {
        for (const provider of providers) {
          if (!reachable.has(provider)) {
            reachable.add(provider);
            queue.push(provider);
          }
        }
      }
    }

    // BFS expansion through building-block requires chains
    while (queue.length > 0) {
      const current = queue.shift()!;
      const providers = consumerToProviders.get(current);
      if (providers) {
        for (const provider of providers) {
          if (!reachable.has(provider)) {
            reachable.add(provider);
            queue.push(provider);
          }
        }
      }
    }

    // Determine which root blocks participate in the interface graph:
    // either as a provider of at least one interface, or as a consumer.
    const providesInterface = new Set<string>(
      workspace.elements
        .filter((e): e is Interface => e.kind === "interface")
        .map((e) => e.provider),
    );
    // consumesInterface: root blocks that appear as consumers in any interface edge
    const consumesInterface = new Set<string>(
      Array.from(consumerToProviders.keys()).filter(
        (id) => index.byId.get(id)?.kind === "building-block",
      ),
    );

    for (const block of rootBlocks) {
      const hasInterfaceParticipation =
        providesInterface.has(block.id) || consumesInterface.has(block.id);
      if (!hasInterfaceParticipation) continue; // H004's territory
      if (reachable.has(block.id)) continue;

      diagnostics.push({
        code: "H022",
        severity: "hint",
        message: `Building block '${block.id}' (${block.title}) participates in interfaces but is not reachable from any actor — consider adding an actor that represents the external stakeholder using this block (chapter 3/5)`,
        file: block.loc.file,
        line: block.loc.line,
      });
    }

    return diagnostics;
  },
};
