/**
 * Semantic architecture diff between two workspace snapshots.
 *
 * Compares parsed models rather than line ranges: elements and diagrams are
 * matched by id, edges by (from, relation, to), and prose by the text of the
 * section it lives in. Formatting-only edits therefore produce no changes.
 *
 * Both payloads must use the same file path convention (e.g. repository-relative
 * paths) so that sections can be matched across snapshots.
 */

import type { AstNode, BlockType, DocumentAst } from "./ast.ts";
import type { DiagramArtifact, Element } from "./model/types.ts";
import type { Edge } from "./resolver/types.ts";
import type { WorkspacePayload } from "./workspace.ts";

export type ChangeStatus = "added" | "removed" | "modified";

export interface AttributeChange {
  name: string;
  /** Value in the base snapshot; undefined when the attribute was added. */
  before?: unknown;
  /** Value in the head snapshot; undefined when the attribute was removed. */
  after?: unknown;
}

export interface Location {
  file: string;
  line: number;
}

/** Identifies a section by its document and the chain of enclosing headings. */
export interface SectionRef {
  file: string;
  /** Heading texts from the outermost to the section's own heading; empty for a preamble. */
  headingPath: string[];
  /** 1-based occurrence among sections with the same file and heading path. */
  occurrence: number;
}

export interface ElementChange {
  id: string;
  kind: BlockType;
  /** "unchanged" means the model is identical but the section prose changed. */
  status: ChangeStatus | "unchanged";
  /** Attribute-level changes; empty for added, removed and unchanged elements. */
  attributes: AttributeChange[];
  /** True when the heading or prose of the element's section differs between snapshots. */
  proseChanged: boolean;
  base?: Location;
  head?: Location;
  section: SectionRef;
}

export interface DiagramChange {
  id: string;
  status: ChangeStatus;
  attributes: AttributeChange[];
  base?: Location;
  head?: Location;
}

export interface EdgeChange {
  status: "added" | "removed";
  edge: Edge;
}

/** A section that contains no blocks in either snapshot. */
export interface ProseSectionChange {
  status: ChangeStatus;
  section: SectionRef;
  base?: Location;
  head?: Location;
}

export interface DocumentChangeSummary {
  file: string;
  added: number;
  modified: number;
  removed: number;
}

export interface ArchitectureDiff {
  elements: ElementChange[];
  diagrams: DiagramChange[];
  edges: EdgeChange[];
  proseSections: ProseSectionChange[];
  /** Change counts per document, sorted by file. */
  documents: DocumentChangeSummary[];
}

/** @internal Shared with the diff view; not part of the public API. */
export interface Section {
  ref: SectionRef;
  key: string;
  startLine: number;
  endLine: number;
  isPreamble: boolean;
  hasBlocks: boolean;
  /** Whitespace-normalized prose of the section. */
  prose: string;
  /** The section's AST nodes, starting with its heading (none for a preamble). */
  nodes: AstNode[];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** @internal Identity of a section across snapshots. */
export function sectionKey(ref: SectionRef): string {
  return JSON.stringify([ref.file, ref.headingPath, ref.occurrence]);
}

function sectionsOf(document: DocumentAst): Section[] {
  const sections: Section[] = [];
  const occurrences = new Map<string, number>();
  const stack: { level: number; text: string }[] = [];
  const prose: string[][] = [];

  const open = (headingPath: string[], startLine: number, isPreamble: boolean) => {
    const pathKey = JSON.stringify(headingPath);
    const occurrence = (occurrences.get(pathKey) ?? 0) + 1;
    occurrences.set(pathKey, occurrence);
    const ref = { file: document.filePath, headingPath, occurrence };
    sections.push({
      ref,
      key: sectionKey(ref),
      startLine,
      endLine: Number.MAX_SAFE_INTEGER,
      isPreamble,
      hasBlocks: false,
      prose: "",
      nodes: [],
    });
    prose.push([]);
  };

  open([], 1, true);
  for (const node of document.nodes) {
    if (node.kind !== "heading") sections[sections.length - 1]!.nodes.push(node);
    const current = sections[sections.length - 1]!;
    if (node.kind === "heading") {
      current.endLine = node.line - 1;
      while (stack.length > 0 && stack[stack.length - 1]!.level >= node.level) stack.pop();
      stack.push({ level: node.level, text: node.text.trim() });
      open(
        stack.map((entry) => entry.text),
        node.line,
        false,
      );
      sections[sections.length - 1]!.nodes.push(node);
    } else if (node.kind === "prose") {
      prose[prose.length - 1]!.push(node.text);
    } else if (node.kind === "block") {
      if (current.isPreamble) {
        throw new Error(
          `${document.filePath}:${node.startLine}: block is not placed under any heading (E017) — fix validation errors before diffing`,
        );
      }
      current.hasBlocks = true;
    }
  }
  sections.forEach((section, index) => {
    section.prose = normalizeText(prose[index]!.join(" "));
  });
  // A preamble without prose or diagrams is not a section of the document.
  return sections.filter(
    (section) =>
      !section.isPreamble ||
      section.prose !== "" ||
      section.nodes.some((node) => node.kind === "diagram" || node.kind === "bare-mermaid"),
  );
}

/** @internal Shared with the diff view; not part of the public API. */
export class SnapshotIndex {
  readonly sections = new Map<string, Section>();
  /** Sections of each document, in document order. */
  readonly sectionsByFile = new Map<string, Section[]>();
  readonly elements = new Map<string, Element>();
  readonly diagrams = new Map<string, DiagramArtifact>();

  constructor(payload: WorkspacePayload, side: "base" | "head") {
    for (const document of payload.documents) {
      const sections = sectionsOf(document);
      this.sectionsByFile.set(document.filePath, sections);
      for (const section of sections) this.sections.set(section.key, section);
    }
    for (const element of payload.elements) {
      if (this.elements.has(element.id)) {
        throw new Error(
          `Duplicate id '${element.id}' in ${side} snapshot (E001) — fix validation errors before diffing`,
        );
      }
      this.elements.set(element.id, element);
    }
    for (const diagram of payload.diagrams) {
      if (this.diagrams.has(diagram.id)) {
        throw new Error(
          `Duplicate diagram id '${diagram.id}' in ${side} snapshot — fix validation errors before diffing`,
        );
      }
      this.diagrams.set(diagram.id, diagram);
    }
  }

  /** The section of an element; a preamble does not hold elements (E017). */
  sectionAt(file: string, line: number): Section {
    const section = this.sectionContaining(file, line);
    if (section.isPreamble) {
      throw new Error(`${file}:${line}: element is not placed in any section of its document`);
    }
    return section;
  }

  /** The section (including a document preamble) that contains a line. */
  sectionContaining(file: string, line: number): Section {
    const section = this.sectionsByFile
      .get(file)
      ?.find((candidate) => candidate.startLine <= line && line <= candidate.endLine);
    if (!section) throw new Error(`${file}:${line}: line is not part of any known section`);
    return section;
  }
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => JSON.stringify(normalizeValue(item)))
      .sort((a, b) => a.localeCompare(b));
  }
  if (typeof value === "string") return value.trim();
  return value;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b));
}

function attributeChanges(
  base: object,
  head: object,
  ignored: ReadonlySet<string>,
  normalize: (name: string, value: unknown) => unknown = (_name, value) => value,
): AttributeChange[] {
  const baseRecord = base as Record<string, unknown>;
  const headRecord = head as Record<string, unknown>;
  const names = [...new Set([...Object.keys(baseRecord), ...Object.keys(headRecord)])]
    .filter((name) => !ignored.has(name))
    .sort();
  const changes: AttributeChange[] = [];
  for (const name of names) {
    const before = baseRecord[name];
    const after = headRecord[name];
    if (sameValue(normalize(name, before), normalize(name, after))) continue;
    changes.push({
      name,
      ...(before !== undefined ? { before } : {}),
      ...(after !== undefined ? { after } : {}),
    });
  }
  return changes;
}

const ELEMENT_IGNORED = new Set(["id", "loc"]);
const DIAGRAM_IGNORED = new Set(["id", "loc"]);

function normalizeDiagramField(name: string, value: unknown): unknown {
  if (name !== "source" || typeof value !== "string") return value;
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function location(loc: { file: string; line: number }): Location {
  return { file: loc.file, line: loc.line };
}

function diffElements(base: SnapshotIndex, head: SnapshotIndex): ElementChange[] {
  const changes: ElementChange[] = [];
  for (const [id, headElement] of head.elements) {
    const headSection = head.sectionAt(headElement.loc.file, headElement.loc.line);
    const baseElement = base.elements.get(id);
    if (!baseElement) {
      const baseSection = base.sections.get(headSection.key);
      changes.push({
        id,
        kind: headElement.kind,
        status: "added",
        attributes: [],
        proseChanged: !baseSection || baseSection.prose !== headSection.prose,
        head: location(headElement.loc),
        section: headSection.ref,
      });
      continue;
    }
    const baseSection = base.sectionAt(baseElement.loc.file, baseElement.loc.line);
    const attributes = attributeChanges(baseElement, headElement, ELEMENT_IGNORED);
    const proseChanged =
      baseSection.key !== headSection.key || baseSection.prose !== headSection.prose;
    if (attributes.length === 0 && !proseChanged) continue;
    changes.push({
      id,
      kind: headElement.kind,
      status: attributes.length > 0 ? "modified" : "unchanged",
      attributes,
      proseChanged,
      base: location(baseElement.loc),
      head: location(headElement.loc),
      section: headSection.ref,
    });
  }
  for (const [id, baseElement] of base.elements) {
    if (head.elements.has(id)) continue;
    const baseSection = base.sectionAt(baseElement.loc.file, baseElement.loc.line);
    const headSection = head.sections.get(baseSection.key);
    changes.push({
      id,
      kind: baseElement.kind,
      status: "removed",
      attributes: [],
      proseChanged: !headSection || headSection.prose !== baseSection.prose,
      base: location(baseElement.loc),
      section: baseSection.ref,
    });
  }
  return changes.sort(byLocation);
}

function diffDiagrams(base: SnapshotIndex, head: SnapshotIndex): DiagramChange[] {
  const changes: DiagramChange[] = [];
  for (const [id, headDiagram] of head.diagrams) {
    const baseDiagram = base.diagrams.get(id);
    if (!baseDiagram) {
      changes.push({ id, status: "added", attributes: [], head: location(headDiagram.loc) });
      continue;
    }
    const attributes = attributeChanges(
      baseDiagram,
      headDiagram,
      DIAGRAM_IGNORED,
      normalizeDiagramField,
    );
    if (attributes.length === 0) continue;
    changes.push({
      id,
      status: "modified",
      attributes,
      base: location(baseDiagram.loc),
      head: location(headDiagram.loc),
    });
  }
  for (const [id, baseDiagram] of base.diagrams) {
    if (head.diagrams.has(id)) continue;
    changes.push({ id, status: "removed", attributes: [], base: location(baseDiagram.loc) });
  }
  return changes.sort(byLocation);
}

function edgeKey(edge: Edge): string {
  return JSON.stringify([edge.from, edge.relation, edge.to]);
}

function diffEdges(baseEdges: Edge[], headEdges: Edge[]): EdgeChange[] {
  const base = new Map(baseEdges.map((edge) => [edgeKey(edge), edge]));
  const head = new Map(headEdges.map((edge) => [edgeKey(edge), edge]));
  const changes: EdgeChange[] = [];
  for (const [key, edge] of head) if (!base.has(key)) changes.push({ status: "added", edge });
  for (const [key, edge] of base) if (!head.has(key)) changes.push({ status: "removed", edge });
  return changes.sort(
    (a, b) =>
      a.edge.from.localeCompare(b.edge.from) ||
      a.edge.relation.localeCompare(b.edge.relation) ||
      a.edge.to.localeCompare(b.edge.to) ||
      a.status.localeCompare(b.status),
  );
}

function sectionLocation(section: Section): Location {
  return { file: section.ref.file, line: section.startLine };
}

function diffProseSections(base: SnapshotIndex, head: SnapshotIndex): ProseSectionChange[] {
  const changes: ProseSectionChange[] = [];
  const proseOnly = (key: string) =>
    !base.sections.get(key)?.hasBlocks && !head.sections.get(key)?.hasBlocks;
  for (const [key, headSection] of head.sections) {
    if (!proseOnly(key)) continue;
    const baseSection = base.sections.get(key);
    if (!baseSection) {
      changes.push({
        status: "added",
        section: headSection.ref,
        head: sectionLocation(headSection),
      });
    } else if (baseSection.prose !== headSection.prose) {
      changes.push({
        status: "modified",
        section: headSection.ref,
        base: sectionLocation(baseSection),
        head: sectionLocation(headSection),
      });
    }
  }
  for (const [key, baseSection] of base.sections) {
    if (head.sections.has(key) || !proseOnly(key)) continue;
    changes.push({
      status: "removed",
      section: baseSection.ref,
      base: sectionLocation(baseSection),
    });
  }
  return changes.sort(byLocation);
}

function byLocation(
  a: { head?: Location; base?: Location },
  b: { head?: Location; base?: Location },
): number {
  const left = (a.head ?? a.base)!;
  const right = (b.head ?? b.base)!;
  return left.file.localeCompare(right.file) || left.line - right.line;
}

function summarize(
  changes: Array<{ status: ChangeStatus | "unchanged"; head?: Location; base?: Location }>,
): DocumentChangeSummary[] {
  const byFile = new Map<string, DocumentChangeSummary>();
  for (const change of changes) {
    const file = (change.status === "removed" ? change.base : change.head)!.file;
    const summary = byFile.get(file) ?? { file, added: 0, modified: 0, removed: 0 };
    if (change.status === "added") summary.added++;
    else if (change.status === "removed") summary.removed++;
    else summary.modified++;
    byFile.set(file, summary);
  }
  return [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
}

export function diffWorkspaces(base: WorkspacePayload, head: WorkspacePayload): ArchitectureDiff {
  const baseIndex = new SnapshotIndex(base, "base");
  const headIndex = new SnapshotIndex(head, "head");
  const elements = diffElements(baseIndex, headIndex);
  const diagrams = diffDiagrams(baseIndex, headIndex);
  const proseSections = diffProseSections(baseIndex, headIndex);
  return {
    elements,
    diagrams,
    edges: diffEdges(base.edges, head.edges),
    proseSections,
    documents: summarize([...elements, ...diagrams, ...proseSections]),
  };
}
