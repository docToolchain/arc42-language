import type { AstNode, HeadingNode } from "../../ast.ts";
import type { Interface, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { Diagnostic, Rule } from "../types.ts";

interface Section {
  file: string;
  order: number;
  heading?: HeadingNode;
}

interface DocumentSections {
  file: string;
  hasBuildingBlocks: boolean;
  headings: HeadingNode[];
  interfaces: Map<string, Section>;
  buildingBlocks: Map<string, Section>;
}

/**
 * W027 — Interfaces are documented in the section of their provider.
 *
 * Interfaces remain first-class elements, but their Markdown placement should
 * make provider ownership visible to readers. The rule is deliberately scoped
 * to building-block documents so context-view interface descriptions can stay
 * with their actors and external interactions.
 */
export const w027InterfaceProviderSubchapter: Rule = {
  meta: {
    code: "W027",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Interfaces should be documented beneath their providing building block",
      rationale:
        "An interface's provider is part of its architectural ownership. Keeping the interface as a direct subchapter of that building block makes the provider visible in the document structure instead of requiring readers to reconstruct ownership from a cross-reference.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const documents: DocumentSections[] = [];
    const sectionsByInterface = new Map<string, Section>();
    const sectionsByBuildingBlock = new Map<string, Section>();
    let order = 0;

    for (const document of workspace.documents) {
      let currentHeading: HeadingNode | undefined;
      let hasBuildingBlocks = false;
      const headings: HeadingNode[] = [];
      const interfaces = new Map<string, Section>();
      const buildingBlocks = new Map<string, Section>();

      for (const node of document.nodes as AstNode[]) {
        order++;
        if (node.kind === "heading") {
          currentHeading = node;
          headings.push(node);
          continue;
        }
        if (node.kind !== "block") continue;

        const id = node.attributes.id;
        if (!id) continue;
        const section = { file: document.filePath, order, heading: currentHeading };
        if (node.blockType === "building-block") {
          hasBuildingBlocks = true;
          buildingBlocks.set(id, section);
          sectionsByBuildingBlock.set(id, section);
        } else if (node.blockType === "interface") {
          interfaces.set(id, section);
          sectionsByInterface.set(id, section);
        }
      }

      documents.push({
        file: document.filePath,
        hasBuildingBlocks,
        headings,
        interfaces,
        buildingBlocks,
      });
    }

    const buildingBlockDocuments = new Set(
      documents.filter((document) => document.hasBuildingBlocks).map((document) => document.file),
    );
    const diagnostics: Diagnostic[] = [];

    for (const element of workspace.elements) {
      if (element.kind !== "interface") continue;
      const iface = element as Interface;
      const interfaceSection = sectionsByInterface.get(iface.id);
      if (!interfaceSection || !buildingBlockDocuments.has(interfaceSection.file)) continue;

      const provider = index.byId.get(iface.provider);
      if (provider?.kind !== "building-block") continue;
      const providerSection = sectionsByBuildingBlock.get(iface.provider);
      const providerDocument = providerSection?.file;

      if (
        !providerSection?.heading ||
        interfaceSection.file !== providerDocument ||
        !interfaceSection.heading
      ) {
        diagnostics.push({
          code: "W027",
          severity: "warning",
          message: `Interface '${iface.id}' should be documented beneath providing building block '${iface.provider}'`,
          file: iface.loc.file,
          line: iface.loc.line,
        });
        continue;
      }

      const providerHeading = providerSection.heading;
      const interfaceHeading = interfaceSection.heading;
      const interveningHeading = documents
        .find((document) => document.file === interfaceSection.file)
        ?.headings.some(
          (heading) =>
            heading.line > providerHeading.line &&
            heading.line < interfaceHeading.line &&
            heading.level <= providerHeading.level,
        );

      if (
        interfaceHeading.level !== providerHeading.level + 1 ||
        interfaceSection.order <= providerSection.order ||
        interveningHeading
      ) {
        diagnostics.push({
          code: "W027",
          severity: "warning",
          message: `Interface '${iface.id}' should be a direct subheading after providing building block '${iface.provider}'`,
          file: iface.loc.file,
          line: iface.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
