/**
 * Render-ready view of an architecture diff: the changed sections ("segments")
 * of both snapshots with their AST nodes (prose already rendered), the
 * elements they define or mention, and the edges between them.
 *
 * A DiffView is self-contained — it can be rendered without the full base or
 * head workspace, which lets one JSON document (or JSONL line) describe a
 * change completely.
 */

import type { AstNode, HeadingNode } from "./ast.ts";
import type { DiffFinding, FindingGroups } from "./diff.ts";
import type { Element } from "./model/types.ts";
import type { Edge } from "./resolver/types.ts";
import type { WorkspacePayload } from "./workspace.ts";
import {
  SectionMatching,
  SnapshotIndex,
  diffWorkspaces,
  sectionKey as sectionKeyOf,
} from "./workspace-diff.ts";
import type {
  ArchitectureDiff,
  ChangeStatus,
  DiagramChange,
  EdgeChange,
  ElementChange,
  ProseSectionChange,
  Section,
  SectionRef,
} from "./workspace-diff.ts";

export interface SectionContent {
  /** The section's AST nodes, starting with its heading (none for a preamble). */
  nodes: AstNode[];
  /** Elements the section defines or mentions (edge endpoints, diagram ids). */
  elements: Element[];
  /** Edges between those elements. */
  edges: Edge[];
}

export interface DiffSegment {
  /** Added: only in head. Removed: only in base. Modified: in both. */
  status: ChangeStatus;
  /** The head section; the base section for a removed one. */
  section: SectionRef;
  /** Set when the section's heading was renamed (paired by the block it defines). */
  heading?: { before: string; after: string };
  base?: SectionContent;
  head?: SectionContent;
  elements: ElementChange[];
  diagrams: DiagramChange[];
  /** Set when the section holds no blocks and its prose changed. */
  prose?: ProseSectionChange;
}

/** One section of a changed document, in the merged order of base and head. */
export interface OutlineEntry {
  section: SectionRef;
  /** Heading level; 0 for a document preamble. */
  level: number;
  /** Heading text; empty for a preamble. */
  title: string;
  /** "unchanged" sections have no segment. */
  status: ChangeStatus | "unchanged";
  /** True when the section holds nothing but its heading (lets viewers skip placeholders). */
  empty: boolean;
  /** Line range of the section in the head document; absent for removed sections. */
  head?: { startLine: number; endLine: number };
}

export interface DiffDocument {
  file: string;
  /** H1 text of the head document, or of the base document when it was removed. */
  title: string;
  added: number;
  modified: number;
  removed: number;
  segments: DiffSegment[];
  /**
   * Every section of the document in head order; a removed section follows the
   * base section that preceded it. Positions the segments within the chapter.
   */
  outline: OutlineEntry[];
}

export interface DiffView {
  documents: DiffDocument[];
  edges: EdgeChange[];
}

/** One visualized difference: the lint findings and the render-ready view of the change. */
export interface DiffPayload {
  base: { label: string; commit: string };
  head: { label: string };
  /** Lint findings, warnings first (same order as `arc42 diff`). */
  findings: DiffFinding[];
  /** The same findings grouped for a reviewer. */
  groups: FindingGroups;
  view: DiffView;
}

interface SegmentDraft {
  base?: Section;
  head?: Section;
  elements: ElementChange[];
  diagrams: DiagramChange[];
  prose?: ProseSectionChange;
}

function mentionedIds(nodes: AstNode[], known: Map<string, Element>): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (node.kind === "block" && node.attributes.id) ids.add(node.attributes.id);
    if (node.kind === "diagram" || node.kind === "bare-mermaid") {
      for (const token of node.source.split(/[^\w-]+/)) if (known.has(token)) ids.add(token);
    }
  }
  return ids;
}

function sectionContent(section: Section, index: SnapshotIndex, edges: Edge[]): SectionContent {
  const own = mentionedIds(section.nodes, index.elements);
  const related = new Set(own);
  for (const edge of edges) {
    if (own.has(edge.from)) related.add(edge.to);
    if (own.has(edge.to)) related.add(edge.from);
  }
  return {
    nodes: section.nodes,
    elements: [...related]
      .map((id) => index.elements.get(id))
      .filter((element): element is Element => element !== undefined)
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.filter((edge) => own.has(edge.from) || own.has(edge.to)),
  };
}

function documentTitle(payload: WorkspacePayload, file: string): string | undefined {
  const heading = payload.documents
    .find((document) => document.filePath === file)
    ?.nodes.find((node): node is HeadingNode => node.kind === "heading" && node.level === 1);
  return heading?.text.trim();
}

/**
 * Build the render-ready view of the change from `base` to `head`. Pass the
 * `diff` when it was already computed for the same snapshots.
 */
export function buildDiffView(
  base: WorkspacePayload,
  head: WorkspacePayload,
  diff: ArchitectureDiff = diffWorkspaces(base, head),
): DiffView {
  const baseIndex = new SnapshotIndex(base, "base");
  const headIndex = new SnapshotIndex(head, "head");
  const sections = new SectionMatching(baseIndex, headIndex);
  // Keyed by the head section, or by the base section when it was removed.
  const drafts = new Map<string, SegmentDraft>();

  const draftFor = (file: string, line: number, side: "base" | "head") => {
    const index = side === "base" ? baseIndex : headIndex;
    const section = index.sectionContaining(file, line);
    const pair =
      side === "base"
        ? { base: section, head: sections.headOf(section) }
        : { base: sections.baseOf(section), head: section };
    const key = (pair.head ?? section).key;
    const draft = drafts.get(key) ?? { elements: [], diagrams: [] };
    draft.base ??= pair.base;
    draft.head ??= pair.head;
    drafts.set(key, draft);
    return draft;
  };

  for (const change of diff.elements) {
    // An element that moved between sections shows up in both segments.
    if (change.head) draftFor(change.head.file, change.head.line, "head").elements.push(change);
    if (change.base) {
      const draft = draftFor(change.base.file, change.base.line, "base");
      if (!draft.elements.includes(change)) draft.elements.push(change);
    }
  }
  for (const change of diff.diagrams) {
    if (change.head) draftFor(change.head.file, change.head.line, "head").diagrams.push(change);
    if (change.base) {
      const draft = draftFor(change.base.file, change.base.line, "base");
      if (!draft.diagrams.includes(change)) draft.diagrams.push(change);
    }
  }
  for (const change of diff.proseSections) {
    const location = (change.head ?? change.base)!;
    draftFor(location.file, location.line, change.head ? "head" : "base").prose = change;
  }

  const byFile = new Map<string, DiffDocument>();
  for (const draft of drafts.values()) {
    const section = (draft.head ?? draft.base)!;
    const file = section.ref.file;
    const document = byFile.get(file) ?? {
      file,
      title: documentTitle(head, file) ?? documentTitle(base, file) ?? file,
      added: 0,
      modified: 0,
      removed: 0,
      segments: [],
      outline: [],
    };
    document.segments.push({
      status: !draft.base ? "added" : !draft.head ? "removed" : "modified",
      section: section.ref,
      ...(draft.base && draft.head && draft.base.title !== draft.head.title
        ? { heading: { before: draft.base.title, after: draft.head.title } }
        : {}),
      ...(draft.base ? { base: sectionContent(draft.base, baseIndex, base.edges) } : {}),
      ...(draft.head ? { head: sectionContent(draft.head, headIndex, head.edges) } : {}),
      elements: draft.elements,
      diagrams: draft.diagrams,
      ...(draft.prose ? { prose: draft.prose } : {}),
    });
    byFile.set(file, document);
  }

  for (const summary of diff.documents) {
    const document = byFile.get(summary.file);
    if (!document) continue;
    document.added = summary.added;
    document.modified = summary.modified;
    document.removed = summary.removed;
  }

  // Segments follow the head document order; removed segments keep their base position.
  const position = (segment: DiffSegment) =>
    segment.head?.nodes[0] ? lineOf(segment.head.nodes[0]) : lineOf(segment.base!.nodes[0]!);
  const documents = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
  for (const document of documents) {
    document.segments.sort((a, b) => position(a) - position(b));
    const statuses = new Map<string, ChangeStatus>();
    for (const segment of document.segments) {
      statuses.set(sectionKeyOf(segment.section), segment.status);
    }
    document.outline = documentOutline(document.file, baseIndex, headIndex, sections, statuses);
  }
  return { documents, edges: diff.edges };
}

function outlineEntry(
  section: Section,
  status: OutlineEntry["status"],
  inHead: boolean,
): OutlineEntry {
  const heading = section.nodes[0]?.kind === "heading" ? section.nodes[0] : undefined;
  return {
    section: section.ref,
    level: heading?.level ?? 0,
    title: heading?.text.trim() ?? "",
    status,
    empty: section.nodes.every(
      (node) => node.kind === "heading" || (node.kind === "prose" && node.text.trim() === ""),
    ),
    ...(inHead ? { head: { startLine: section.startLine, endLine: section.endLine } } : {}),
  };
}

/** Merge the section order of base and head; removed sections keep their base position. */
function documentOutline(
  file: string,
  baseIndex: SnapshotIndex,
  headIndex: SnapshotIndex,
  sections: SectionMatching,
  statuses: Map<string, ChangeStatus>,
): OutlineEntry[] {
  const headSections = headIndex.sectionsByFile.get(file) ?? [];
  // Removed sections, grouped by the head counterpart of the last preceding base section that survives.
  const removedAfter = new Map<string | null, Section[]>();
  let anchor: string | null = null;
  for (const section of baseIndex.sectionsByFile.get(file) ?? []) {
    const counterpart = sections.headOf(section);
    if (counterpart) {
      anchor = counterpart.key;
      continue;
    }
    removedAfter.set(anchor, [...(removedAfter.get(anchor) ?? []), section]);
  }
  const removed = (key: string | null) =>
    (removedAfter.get(key) ?? []).map((section) => outlineEntry(section, "removed", false));
  const outline = removed(null);
  for (const section of headSections) {
    outline.push(outlineEntry(section, statuses.get(section.key) ?? "unchanged", true));
    outline.push(...removed(section.key));
  }
  return outline;
}

function lineOf(node: AstNode): number {
  return node.kind === "heading" || node.kind === "prose" ? node.line : node.startLine;
}
