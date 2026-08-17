import { readFile } from "node:fs/promises";
import { discoverFiles } from "./discovery.ts";
import { MarkdownParser } from "./parser/markdown-parser.ts";
import { buildWorkspace } from "./model/builder.ts";
import { buildIndex } from "./resolver/index.ts";
import { validate } from "./validator/index.ts";
import type { Diagnostic } from "./validator/types.ts";
import type { Element } from "./model/types.ts";
import type { BlockType } from "./ast.ts";
import type { ReferenceIndex } from "./resolver/types.ts";

export interface ValidateOptions {
  dir: string;
}

export interface ValidateResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

export interface ListOptions {
  dir: string;
  type: BlockType;
}

export interface ShowResult {
  element: Element;
  refsFrom: Element[];
  refsTo: Element[];
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

export async function validateWorkspace(
  opts: ValidateOptions,
): Promise<ValidateResult> {
  const { workspace, index } = await runPipeline(opts.dir);
  const diagnostics = validate(workspace, index);
  const valid = !diagnostics.some((d) => d.severity === "error");
  return { valid, diagnostics };
}

export async function listElements(opts: ListOptions): Promise<Element[]> {
  const { workspace } = await runPipeline(opts.dir);
  return workspace.elements.filter((e) => e.kind === opts.type);
}

export async function showElement(opts: {
  dir: string;
  id: string;
}): Promise<ShowResult | null> {
  const { workspace, index } = await runPipeline(opts.dir);
  const element = index.byId.get(opts.id);
  if (!element) return null;

  const refsFromIds = index.refsFrom.get(opts.id) ?? [];
  const refsToIds = index.refsTo.get(opts.id) ?? [];

  const refsFrom = refsFromIds
    .map((id) => index.byId.get(id))
    .filter((e): e is Element => e !== undefined);
  const refsTo = refsToIds
    .map((id) => index.byId.get(id))
    .filter((e): e is Element => e !== undefined);

  return { element, refsFrom, refsTo };
}

export type { Diagnostic, Severity } from "./validator/types.ts";
export type { Element, QualityGoal, BuildingBlock, Interface, Concept, Decision, Workspace, ParseError } from "./model/types.ts";
export type { ReferenceIndex } from "./resolver/types.ts";
export type { BlockType } from "./ast.ts";
