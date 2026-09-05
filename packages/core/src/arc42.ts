import { readFile } from "node:fs/promises";
import { discoverFiles } from "./discovery.ts";
import { MarkdownParser } from "./parser/markdown-parser.ts";
import { buildWorkspace } from "./model/builder.ts";
import { buildIndex } from "./resolver/index.ts";
import { validate } from "./validator/index.ts";
import { ELEMENT_KIND_ORDER } from "./model/types.ts";
import type { Diagnostic } from "./validator/types.ts";
import type { Element } from "./model/types.ts";
import type { ReferenceIndex } from "./resolver/types.ts";
import type {
  GetQuery,
  GetResult,
  WorkspaceView,
  ElementView,
  Edge,
  ResolvedRef,
  WorkspacePayload,
} from "./renderer/types.ts";

export interface ValidateOptions {
  dir: string;
}

export interface ValidateResult {
  version: 1;
  valid: boolean;
  diagnostics: Diagnostic[];
}

export interface GetOptions {
  dir: string;
  query: GetQuery;
}

async function runPipeline(dir: string) {
  const parser = new MarkdownParser();
  const files = await discoverFiles(dir);
  const documents = await Promise.all(
    files.map(async (f) => {
      const content = await readFile(f, "utf-8");
      return parser.parse(f, content);
    }),
  );
  const workspace = buildWorkspace(documents);
  const index = buildIndex(workspace);
  return { workspace, index };
}

export async function validateWorkspace(opts: ValidateOptions): Promise<ValidateResult> {
  const { workspace, index } = await runPipeline(opts.dir);
  const diagnostics = validate(workspace, index);
  const valid = !diagnostics.some((d) => d.severity === "error");
  return { version: 1, valid, diagnostics };
}

/** Build all edges from the reference index */
function buildEdges(workspace: { elements: Element[] }, _index: ReferenceIndex): Edge[] {
  const edges: Edge[] = [];
  for (const el of workspace.elements) {
    if (el.kind === "building-block") {
      if (el.parent) {
        edges.push({ from: el.id, to: el.parent, relation: "parent" });
      }
      for (const ref of el.implements) {
        edges.push({ from: el.id, to: ref, relation: "implements" });
      }
    } else if (el.kind === "interface") {
      edges.push({ from: el.id, to: el.between[0], relation: "between" });
      edges.push({ from: el.id, to: el.between[1], relation: "between" });
    } else if (el.kind === "decision") {
      for (const ref of el.addresses) {
        edges.push({ from: el.id, to: ref, relation: "addresses" });
      }
    } else if (el.kind === "solution-strategy") {
      for (const ref of el.addresses) {
        edges.push({ from: el.id, to: ref, relation: "addresses" });
      }
    } else if (el.kind === "runtime-scenario") {
      for (const ref of el.involves) {
        edges.push({ from: el.id, to: ref, relation: "involves" });
      }
    } else if (el.kind === "deployment-node") {
      if (el.parent) edges.push({ from: el.id, to: el.parent, relation: "parent" });
      for (const ref of el.hosts) {
        edges.push({ from: el.id, to: ref, relation: "hosts" });
      }
    } else if (el.kind === "quality-scenario") {
      edges.push({ from: el.id, to: el.quality, relation: "elaborates" });
    }
  }
  return edges;
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

export async function loadWorkspace(dir: string): Promise<WorkspacePayload> {
  const { workspace, index } = await runPipeline(dir);
  const elements = sortElements(workspace.elements);
  const edges = buildEdges(workspace, index);
  return {
    elements,
    edges,
    diagrams: workspace.diagrams,
    documents: workspace.documents,
  };
}

export async function getElements(opts: GetOptions): Promise<GetResult> {
  const { workspace, index } = await runPipeline(opts.dir);
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
  const edges = buildEdges(workspace, index);

  const view: WorkspaceView = {
    kind: "workspace",
    elements,
    edges,
    typeFilter: query.typeFilter,
  };
  return view;
}

export type { Diagnostic, Severity } from "./validator/types.ts";
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
export type { ReferenceIndex } from "./resolver/types.ts";
export type { BlockType } from "./ast.ts";
export type {
  GetQuery,
  GetResult,
  WorkspaceQuery,
  ElementQuery,
  WorkspaceView,
  ElementView,
  Edge,
  ResolvedRef,
  GetRenderer,
  RendererMeta,
  ElementRenderers,
  WorkspacePayload,
} from "./renderer/types.ts";
