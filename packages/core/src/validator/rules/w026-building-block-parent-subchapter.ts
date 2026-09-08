import type { AstNode, HeadingNode } from "../../ast.ts";
import type { BuildingBlock, Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { Diagnostic, Rule } from "../types.ts";

interface BlockSection {
  file: string;
  order: number;
  heading?: HeadingNode;
}

interface DocumentSections {
  file: string;
  headings: HeadingNode[];
  blocksByHeading: Map<HeadingNode, AstNode[]>;
}

/**
 * W026 — Building-block hierarchy is represented consistently in Markdown.
 *
 * The model stores the heading text for an element, while this structural rule
 * also needs the Markdown heading level and source order from the raw AST.
 */
export const w026BuildingBlockParentSubchapter: Rule = {
  meta: {
    code: "W026",
    severity: "warning",
    type: "problem",
    docs: {
      description:
        "Building-block parent sections and child subchapters must match the declared hierarchy",
      rationale:
        "A parent reference describes a decomposition hierarchy, and the Markdown structure should make that hierarchy visible to readers. Requiring the parent section to document its own block and keeping each child one heading level below and after it prevents the prose and model from presenting different trees.",
      arc42Chapter: 5,
      recommended: true,
    },
  },
  check(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
    const sections = new Map<string, BlockSection>();
    const documents: DocumentSections[] = [];
    let order = 0;

    for (const document of workspace.documents) {
      let currentHeading: HeadingNode | undefined;
      const headings: HeadingNode[] = [];
      const blocksByHeading = new Map<HeadingNode, AstNode[]>();
      for (const node of document.nodes as AstNode[]) {
        order++;
        if (node.kind === "heading") {
          currentHeading = node;
          headings.push(node);
          blocksByHeading.set(node, []);
        } else if (node.kind === "block" && node.blockType === "building-block") {
          const id = node.attributes.id;
          if (id) {
            sections.set(id, { file: document.filePath, order, heading: currentHeading });
            if (currentHeading) {
              blocksByHeading.get(currentHeading)?.push(node);
            }
          }
        }
      }
      documents.push({ file: document.filePath, headings, blocksByHeading });
    }

    const diagnostics: Diagnostic[] = [];

    // A heading with direct child building-block sections claims to be a
    // decomposition section. It must also document the parent it claims.
    for (const document of documents) {
      for (const heading of document.headings) {
        const parentIds = new Set<string>();
        for (const [sectionHeading, blocks] of document.blocksByHeading) {
          if (sectionHeading.level !== heading.level + 1) continue;
          if (sectionHeading.line <= heading.line) continue;
          const interveningHeading = document.headings.some(
            (candidate) =>
              candidate.line > heading.line &&
              candidate.line < sectionHeading.line &&
              candidate.level <= heading.level,
          );
          if (interveningHeading) continue;
          for (const block of blocks) {
            const parentId = block.kind === "block" ? block.attributes.parent : undefined;
            if (parentId) parentIds.add(parentId);
          }
        }

        for (const parentId of parentIds) {
          const parent = index.byId.get(parentId);
          const documentsParent = document.blocksByHeading
            .get(heading)
            ?.some(
              (block) =>
                block.kind === "block" &&
                block.blockType === "building-block" &&
                block.attributes.id === parentId,
            );
          if (parent?.kind !== "building-block" || documentsParent) continue;
          diagnostics.push({
            code: "W026",
            severity: "warning",
            message: `Parent section '${heading.text}' must document building block '${parentId}'`,
            file: document.file,
            line: heading.line,
          });
        }
      }
    }

    for (const element of workspace.elements) {
      if (element.kind !== "building-block" || !element.parent) continue;

      const child = element as BuildingBlock;
      const parentId = child.parent;
      if (!parentId) continue;
      const childSection = sections.get(child.id);
      const parentSection = sections.get(parentId);
      const parent = index.byId.get(parentId);

      if (!parent) continue;

      if (!parentSection?.heading) {
        diagnostics.push({
          code: "W026",
          severity: "warning",
          message: `Parent building block '${parentId}' has no heading for child building block '${child.id}'`,
          file: child.loc.file,
          line: child.loc.line,
        });
        continue;
      }

      if (
        !childSection?.heading ||
        childSection.heading.level !== parentSection.heading.level + 1
      ) {
        diagnostics.push({
          code: "W026",
          severity: "warning",
          message: `Child building block '${child.id}' must be exactly one heading level deeper than parent building block '${parentId}'`,
          file: child.loc.file,
          line: child.loc.line,
        });
        continue;
      }

      if (
        !childSection ||
        childSection.file !== parentSection.file ||
        childSection.order <= parentSection.order
      ) {
        diagnostics.push({
          code: "W026",
          severity: "warning",
          message: `Child building block '${child.id}' must appear after parent building block '${parentId}'`,
          file: child.loc.file,
          line: child.loc.line,
        });
      }
    }

    return diagnostics;
  },
};
