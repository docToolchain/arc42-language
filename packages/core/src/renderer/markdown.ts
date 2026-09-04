import type { GetRenderer, GetResult, WorkspaceView, ElementView, ResolvedRef } from "./types.ts";
import { ELEMENT_CHAPTER, CHAPTER_TITLE } from "../model/types.ts";
import type {
  Element,
  SourceLocation,
  QualityGoal,
  QualityScenario,
  Actor,
  SolutionStrategy,
  BuildingBlock,
  Interface,
  Concept,
  Decision,
  Constraint,
  Risk,
  GlossaryTerm,
  RuntimeScenario,
  DeploymentNode,
} from "../model/types.ts";

/**
 * GitHub-style heading anchor slug.
 * Lowercase, spaces → hyphens, strip non-alphanumeric except hyphens.
 * Returns an empty string for headings that produce no alphanumeric content.
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build a markdown link for a source location. */
function locLink(loc: SourceLocation): string {
  const label = `${loc.file}:${loc.line}`;
  const slug = loc.heading ? toSlug(loc.heading) : "";
  const href = slug ? `${loc.file}#${slug}` : loc.file;
  return `[${label}](${href})`;
}

/** Build a markdown link for a resolved ref. Falls back to plain id if no element. */
function refLink(ref: ResolvedRef): string {
  if (!ref.element) return ref.id;
  const { loc } = ref.element;
  const href = loc.heading ? `${loc.file}#${toSlug(loc.heading)}` : loc.file;
  return `[${ref.id}](${href}) — ${ref.element.kind}`;
}

export class MarkdownGetRenderer implements GetRenderer {
  meta = {
    id: "markdown",
    description: "Markdown renderer with navigable reference links",
    mimeType: "text/markdown",
  };

  render(result: GetResult): string {
    if (result.kind === "workspace") {
      return this.renderWorkspace(result);
    }
    return this.renderElement(result);
  }

  private renderWorkspace(view: WorkspaceView): string {
    const elements = view.elements;
    const typeFilter = view.typeFilter;

    const chapterElements = new Map<number, Element[]>();
    for (const el of elements) {
      const chapter = ELEMENT_CHAPTER[el.kind];
      if (!chapterElements.has(chapter)) chapterElements.set(chapter, []);
      chapterElements.get(chapter)!.push(el);
    }

    const sortedChapters = [...chapterElements.keys()].sort((a, b) => a - b);

    const title = typeFilter
      ? `arc42 Architecture — ${CHAPTER_TITLE[ELEMENT_CHAPTER[typeFilter]] ?? typeFilter}`
      : "arc42 Architecture";

    const lines: string[] = [`# ${title}`, ""];

    for (const chapter of sortedChapters) {
      const els = chapterElements.get(chapter)!;
      const chapterTitle = CHAPTER_TITLE[chapter] ?? `Chapter ${chapter}`;
      lines.push(`## Chapter ${chapter} — ${chapterTitle} (${els.length})`, "");

      for (const el of els) {
        lines.push(`### ${el.id} — ${el.title}`, "");
        if (el.loc.prose) {
          lines.push(el.loc.prose, "");
        }
        const fields = this.workspaceFields(el);
        for (const f of fields) lines.push(`- ${f}`);
        lines.push(`- location: ${locLink(el.loc)}`, "");
      }
    }

    return lines.join("\n");
  }

  private renderElement(view: ElementView): string {
    const el = view.element;
    const lines: string[] = [];

    lines.push(`# [${el.kind}] ${el.id}`, "");
    lines.push(`**${el.title}**`, "");

    if (el.loc.prose) {
      lines.push(el.loc.prose, "");
    }

    const fields = this.elementFields(el);
    for (const f of fields) lines.push(`- ${f}`);
    if (fields.length > 0) lines.push("");

    // References section
    if (view.refsFrom.length > 0 || view.refsTo.length > 0) {
      lines.push("## References", "");
      if (view.refsFrom.length > 0) {
        lines.push("**→ outgoing**");
        for (const ref of view.refsFrom) lines.push(`- ${refLink(ref)}`);
        lines.push("");
      }
      if (view.refsTo.length > 0) {
        lines.push("**← incoming**");
        for (const ref of view.refsTo) lines.push(`- ${refLink(ref)}`);
        lines.push("");
      }
    }

    lines.push(`*location: ${locLink(el.loc)}*`);

    return lines.join("\n");
  }

  /** Returns compact field bullets for workspace view (mirrors text.ts density). */
  private workspaceFields(el: Element): string[] {
    // quality-scenario workspace view: compact (quality + metric only), matching text.ts
    if (el.kind === "quality-scenario") {
      const f: string[] = [`quality: ${el.quality}`];
      if (el.metric) f.push(`metric: ${el.metric}`);
      return f;
    }
    return this.elementFields(el);
  }

  /** Returns full field bullet strings (without the leading "- ") for an element. */
  private elementFields(el: Element): string[] {
    const f: string[] = [];
    switch (el.kind) {
      case "quality-goal":
        return this.qualityGoalFields(el);
      case "quality-scenario":
        return this.qualityScenarioFields(el);
      case "actor":
        return this.actorFields(el);
      case "solution-strategy":
        return this.solutionStrategyFields(el);
      case "building-block":
        return this.buildingBlockFields(el);
      case "interface":
        return this.interfaceFields(el);
      case "runtime-scenario":
        return this.runtimeScenarioFields(el);
      case "deployment-node":
        return this.deploymentNodeFields(el);
      case "concept":
        return this.conceptFields(el);
      case "decision":
        return this.decisionFields(el);
      case "constraint":
        return this.constraintFields(el);
      case "risk":
        return this.riskFields(el);
      case "glossary-term":
        return this.glossaryTermFields(el);
    }
    return f;
  }

  private qualityGoalFields(el: QualityGoal): string[] {
    const f: string[] = [`priority: ${el.priority}`];
    if (el.scenario) f.push(`scenario: ${el.scenario}`);
    return f;
  }

  private qualityScenarioFields(el: QualityScenario): string[] {
    const f: string[] = [`quality: ${el.quality}`];
    if (el.stimulus) f.push(`stimulus: ${el.stimulus}`);
    if (el.response) f.push(`response: ${el.response}`);
    if (el.metric) f.push(`metric: ${el.metric}`);
    return f;
  }

  private actorFields(el: Actor): string[] {
    const f: string[] = [`type: ${el.type}`];
    // description is omitted when loc.prose is present — the prose already captures it
    if (el.description && !el.loc.prose) f.push(`description: ${el.description}`);
    return f;
  }

  private solutionStrategyFields(el: SolutionStrategy): string[] {
    const f: string[] = [];
    if (el.addresses.length > 0) f.push(`addresses: ${el.addresses.join(", ")}`);
    return f;
  }

  private buildingBlockFields(el: BuildingBlock): string[] {
    const f: string[] = [];
    if (el.technology) f.push(`technology: ${el.technology}`);
    if (el.parent) f.push(`parent: ${el.parent}`);
    if (el.implements.length > 0) f.push(`implements: ${el.implements.join(", ")}`);
    return f;
  }

  private interfaceFields(el: Interface): string[] {
    const f: string[] = [`between: ${el.between[0]} ↔ ${el.between[1]}`];
    if (el.protocol) f.push(`protocol: ${el.protocol}`);
    return f;
  }

  private runtimeScenarioFields(el: RuntimeScenario): string[] {
    const f: string[] = [];
    if (el.trigger) f.push(`trigger: ${el.trigger}`);
    if (el.involves.length > 0) f.push(`involves: ${el.involves.join(", ")}`);
    return f;
  }

  private deploymentNodeFields(el: DeploymentNode): string[] {
    const f: string[] = [];
    if (el.type) f.push(`type: ${el.type}`);
    if (el.parent) f.push(`parent: ${el.parent}`);
    if (el.hosts.length > 0) f.push(`hosts: ${el.hosts.join(", ")}`);
    return f;
  }

  private conceptFields(el: Concept): string[] {
    const f: string[] = [];
    if (el.category) f.push(`category: ${el.category}`);
    return f;
  }

  private decisionFields(el: Decision): string[] {
    const f: string[] = [`status: ${el.status}`];
    if (el.date) f.push(`date: ${el.date}`);
    if (el.addresses.length > 0) f.push(`addresses: ${el.addresses.join(", ")}`);
    if (el.supersedes) f.push(`supersedes: ${el.supersedes}`);
    return f;
  }

  private constraintFields(el: Constraint): string[] {
    const f: string[] = [`category: ${el.category}`];
    if (el.source) f.push(`source: ${el.source}`);
    return f;
  }

  private riskFields(el: Risk): string[] {
    const f: string[] = [`severity: ${el.severity}`];
    if (el.mitigation) f.push(`mitigation: ${el.mitigation}`);
    return f;
  }

  private glossaryTermFields(el: GlossaryTerm): string[] {
    return [`definition: ${el.definition}`];
  }
}
