import type { GetRenderer, GetResult, WorkspaceView, ElementView, ResolvedRef } from "./types.ts";
import { ELEMENT_KIND_ORDER, ELEMENT_CHAPTER, CHAPTER_TITLE } from "../model/types.ts";
import type { Element, QualityGoal, Actor, BuildingBlock, Interface, Concept, Decision, Constraint, Risk, GlossaryTerm } from "../model/types.ts";

export class TextGetRenderer implements GetRenderer {
  meta = {
    id: "text",
    description: "Plain text renderer",
    mimeType: "text/plain",
  };

  render(result: GetResult): string {
    if (result.kind === "workspace") {
      return this.renderWorkspace(result);
    }
    return this.renderElement(result);
  }

  private renderWorkspace(view: WorkspaceView): string {
    const elements = view.elements;

    // Group elements by chapter, keeping track of unique chapters that have elements
    const chapterElements = new Map<number, Element[]>();
    const chapterCounts = new Map<number, number>();

    for (const el of elements) {
      const chapter = ELEMENT_CHAPTER[el.kind];
      if (!chapterElements.has(chapter)) {
        chapterElements.set(chapter, []);
        chapterCounts.set(chapter, 0);
      }
      chapterElements.get(chapter)!.push(el);

      // Count elements by chapter - each element type counts, so we increment per element
      // But we need unique per chapter even if multiple kinds share a chapter
      // Actually looking at the spec: "with element count, unique per chapter even if multiple kinds share a chapter"
      // This means count ALL elements in that chapter, not unique kinds
      chapterCounts.set(chapter, (chapterCounts.get(chapter) ?? 0) + 1);
    }

    // Sort chapters in order and render
    const sortedChapters = [...chapterElements.keys()].sort((a, b) => a - b);

    const lines: string[] = [];
    for (const chapter of sortedChapters) {
      const chapterElementsList = chapterElements.get(chapter)!;
      const count = chapterCounts.get(chapter)!;
      const title = CHAPTER_TITLE[chapter];
      lines.push(`=== ${title} (${count}) ===`);

      for (const el of chapterElementsList) {
        lines.push(this.renderElementLine(el));
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  private renderElementLine(el: Element): string {
    switch (el.kind) {
      case "quality-goal":
        return this.renderQualityGoal(el);
      case "constraint":
        return this.renderConstraint(el);
      case "actor":
        return this.renderActor(el);
      case "building-block":
        return this.renderBuildingBlock(el);
      case "interface":
        return this.renderInterface(el);
      case "concept":
        return this.renderConcept(el);
      case "decision":
        return this.renderDecision(el);
      case "risk":
        return this.renderRisk(el);
      case "glossary-term":
        return this.renderGlossaryTerm(el);
    }
  }

  private renderQualityGoal(el: QualityGoal): string {
    const lines: string[] = [];
    lines.push(`  ${el.id}  ${el.title}  [${el.priority}]`);

    if (el.scenario) {
      lines.push(`    scenario: ${el.scenario}`);
    }

    // refsFrom contains outgoing - for quality goal, this would be addressed-by
    // We need to find edges where the quality goal is the target
    // This is handled at workspace level with edges array

    return lines.join("\n");
  }

  private renderActor(el: Actor): string {
    let line = `  ${el.id}  ${el.title}  [${el.type}]`;
    if (el.description) {
      line += `  — ${el.description}`;
    }
    return line;
  }

  private renderBuildingBlock(el: BuildingBlock): string {
    const lines: string[] = [];
    let line = `  ${el.id}  ${el.title}`;

    if (el.technology) {
      line += `  [${el.technology}]`;
    }
    lines.push(line);

    if (el.implements.length > 0) {
      lines.push(`    implements: ${el.implements.join(", ")}`);
    }

    if (el.parent) {
      lines.push(`    parent: ${el.parent}`);
    }

    return lines.join("\n");
  }

  private renderInterface(el: Interface): string {
    const lines: string[] = [];
    let line = `  ${el.id}  ${el.title}`;

    if (el.protocol) {
      line += `  [${el.protocol}]`;
    }
    lines.push(line);
    lines.push(`    between: ${el.between[0]} ↔ ${el.between[1]}`);

    return lines.join("\n");
  }

  private renderConcept(el: Concept): string {
    let line = `  ${el.id}  ${el.title}`;

    if (el.category) {
      line += `  [${el.category}]`;
    }

    return line;
  }

  private renderDecision(el: Decision): string {
    const lines: string[] = [];
    let line = `  ${el.id}  ${el.title}  [${el.status}]`;

    if (el.date) {
      line += `  ${el.date}`;
    }
    lines.push(line);

    if (el.addresses.length > 0) {
      lines.push(`    addresses: ${el.addresses.join(", ")}`);
    }

    if (el.supersedes) {
      lines.push(`    supersedes: ${el.supersedes}`);
    }

    return lines.join("\n");
  }

  private renderConstraint(el: Constraint): string {
    let line = `  ${el.id}  ${el.title}  [${el.category}]`;
    if (el.source) {
      line += `  (${el.source})`;
    }
    return line;
  }

  private renderRisk(el: Risk): string {
    const lines: string[] = [];
    lines.push(`  ${el.id}  ${el.title}  [${el.severity}]`);
    if (el.mitigation) {
      lines.push(`    mitigation: ${el.mitigation}`);
    }
    return lines.join("\n");
  }

  private renderGlossaryTerm(el: GlossaryTerm): string {
    return `  ${el.id}  ${el.title}: ${el.definition}`;
  }

  private renderElement(view: ElementView): string {
    const el = view.element;
    const lines: string[] = [];

    // Header: [{kind}] {id}  {title}
    lines.push(`[${el.kind}] ${el.id}  ${el.title}`);

    // All fields of the element (skip undefined/empty)
    switch (el.kind) {
      case "quality-goal":
        if (el.priority) lines.push(`  priority: ${el.priority}`);
        if (el.scenario) lines.push(`  scenario: ${el.scenario}`);
        break;
      case "actor":
        lines.push(`  type: ${el.type}`);
        if (el.description) lines.push(`  description: ${el.description}`);
        break;
      case "building-block":
        if (el.technology) lines.push(`  technology: ${el.technology}`);
        if (el.parent) lines.push(`  parent: ${el.parent}`);
        if (el.implements.length > 0) lines.push(`  implements: ${el.implements.join(", ")}`);
        break;
      case "interface":
        if (el.protocol) lines.push(`  protocol: ${el.protocol}`);
        lines.push(`  between: ${el.between[0]} ↔ ${el.between[1]}`);
        break;
      case "concept":
        if (el.category) lines.push(`  category: ${el.category}`);
        break;
      case "decision":
        lines.push(`  status: ${el.status}`);
        if (el.date) lines.push(`  date: ${el.date}`);
        if (el.addresses.length > 0) lines.push(`  addresses: ${el.addresses.join(", ")}`);
        if (el.supersedes) lines.push(`  supersedes: ${el.supersedes}`);
        break;
      case "constraint":
        lines.push(`  category: ${el.category}`);
        if (el.source) lines.push(`  source: ${el.source}`);
        break;
      case "risk":
        lines.push(`  severity: ${el.severity}`);
        if (el.mitigation) lines.push(`  mitigation: ${el.mitigation}`);
        break;
      case "glossary-term":
        lines.push(`  definition: ${el.definition}`);
        break;
    }

    // refs → (outgoing) - refsFrom
    if (view.refsFrom.length > 0) {
      const refsStr = view.refsFrom
        .map((r) => {
          const kind = r.element?.kind;
          return `${r.id}${kind ? ` (${kind})` : ""}`;
        })
        .join(", ");
      lines.push(`  refs →  ${refsStr}`);
    }

    // refs ← (incoming) - refsTo
    if (view.refsTo.length > 0) {
      const refsStr = view.refsTo
        .map((r) => {
          const kind = r.element?.kind;
          return `${r.id}${kind ? ` (${kind})` : ""}`;
        })
        .join(", ");
      lines.push(`  refs ←  ${refsStr}`);
    }

    // location
    lines.push(`  location: ${el.loc.file}:${el.loc.line}`);

    return lines.join("\n");
  }
}