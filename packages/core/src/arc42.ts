import { MarkdownParser } from "./parser/markdown-parser.ts";
import { buildWorkspace } from "./model/builder.ts";
import { buildIndex } from "./resolver/index.ts";
import { validate } from "./validator/index.ts";
import { ELEMENT_KIND_ORDER } from "./model/types.ts";
import type { Diagnostic, ValidationContext } from "./validator/types.ts";
import type { Element } from "./model/types.ts";
import type { ReferenceIndex } from "./resolver/types.ts";
import type { DocumentAst } from "./ast.ts";
import type { Workspace } from "./model/types.ts";
import type {
  GetQuery,
  GetResult,
  WorkspaceView,
  ElementView,
  ResolvedRef,
  WorkspacePayload,
} from "./renderer/types.ts";

export interface ValidateResult {
  version: 1;
  valid: boolean;
  diagnostics: Diagnostic[];
}

export interface GetDocumentsOptions {
  documents: DocumentAst[];
  query: GetQuery;
}

export function parseArchitectureDocument(filePath: string, content: string): DocumentAst {
  return new MarkdownParser().parse(filePath, content);
}

/** Build the workspace from documents and index reference relationships */
export function processArchitecture(
  documents: DocumentAst[],
  context?: ValidationContext,
): {
  workspace: Workspace;
  index: ReferenceIndex;
  diagnostics: Diagnostic[];
} {
  const workspace = buildWorkspace(documents);
  const index = buildIndex(workspace);
  const diagnostics = validate(workspace, index, context);
  return { workspace, index, diagnostics };
}

export function validateDocuments(
  documents: DocumentAst[],
  context?: ValidationContext,
): ValidateResult {
  const { diagnostics } = processArchitecture(documents, context);
  const valid = !diagnostics.some((d) => d.severity === "error");
  return { version: 1, valid, diagnostics };
}

export function loadWorkspaceFromDocuments(documents: DocumentAst[]): WorkspacePayload {
  const workspace = buildWorkspace(documents);
  const index = buildIndex(workspace);
  const elements = sortElements(workspace.elements);
  return {
    elements,
    edges: index.edges,
    diagrams: workspace.diagrams,
    documents: workspace.documents,
  };
}

export function getElementsFromDocuments(opts: GetDocumentsOptions): GetResult {
  const workspace = buildWorkspace(opts.documents);
  const index = buildIndex(workspace);
  const query = opts.query;

  if (query.kind === "element") {
    const element = index.byId.get(query.id);
    if (!element) return null as unknown as GetResult; // caller handles null

    const refsFromIds = index.refsFrom.get(element.id) ?? [];
    const refsToIds = index.refsTo.get(element.id) ?? [];

    const refsFrom: ResolvedRef[] = refsFromIds.map((id) => ({
      id,
      element: index.byId.get(id),
    }));
    const refsTo: ResolvedRef[] = refsToIds.map((id) => ({
      id,
      element: index.byId.get(id),
    }));

    const view: ElementView = { kind: "element", element, refsFrom, refsTo };
    return view;
  }

  // Workspace query
  let elements = workspace.elements;
  if (query.typeFilter) {
    elements = elements.filter((e) => e.kind === query.typeFilter);
  }
  elements = sortElements(elements);

  const view: WorkspaceView = {
    kind: "workspace",
    elements,
    edges: index.edges,
    typeFilter: query.typeFilter,
  };
  return view;
}

/** Sort elements: canonical kind order, then priority descending for quality-goal, then alphabetical by id */
function sortElements(elements: Element[]): Element[] {
  const kindRank = new Map(ELEMENT_KIND_ORDER.map((k, i) => [k, i]));
  const priorityRank: Record<string, number> = { high: 2, medium: 1, low: 0 };
  return [...elements].sort((a, b) => {
    const kindDiff = (kindRank.get(a.kind) ?? 99) - (kindRank.get(b.kind) ?? 99);
    if (kindDiff !== 0) return kindDiff;
    // Secondary sort for quality-goal: descending priority (high first)
    if (a.kind === "quality-goal" && b.kind === "quality-goal") {
      const priorityDiff = (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

export type { Diagnostic, Severity, PathEvidence, ValidationContext } from "./validator/types.ts";
export type {
  Element,
  QualityGoal,
  QualityScenario,
  Actor,
  SolutionStrategy,
  Constraint,
  BuildingBlock,
  Interface,
  RuntimeScenario,
  DeploymentNode,
  Diagram,
  GenericDiagram,
  SequenceDiagram,
  DeploymentDiagram,
  DiagramArtifact,
  Concept,
  Decision,
  Risk,
  GlossaryTerm,
  Workspace,
  ParseError,
} from "./model/types.ts";
export type { ReferenceIndex, Edge } from "./resolver/types.ts";
export type { BlockType } from "./ast.ts";
export type {
  GetQuery,
  GetResult,
  WorkspaceQuery,
  ElementQuery,
  WorkspaceView,
  ElementView,
  ResolvedRef,
  GetRenderer,
  RendererMeta,
  ElementRenderers,
  WorkspacePayload,
} from "./renderer/types.ts";
