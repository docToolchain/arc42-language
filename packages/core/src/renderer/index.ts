import type { GetRenderer } from "./types.ts";
import { TextGetRenderer } from "./text.ts";
import { JsonGetRenderer } from "./json.ts";
import { MarkdownGetRenderer } from "./markdown.ts";

const textRenderer = new TextGetRenderer();
const jsonRenderer = new JsonGetRenderer();
const markdownRenderer = new MarkdownGetRenderer();

export const builtinGetRenderers: readonly GetRenderer[] = [
  textRenderer,
  jsonRenderer,
  markdownRenderer,
];
export const rendererById: ReadonlyMap<string, GetRenderer> = new Map(
  builtinGetRenderers.map((r) => [r.meta.id, r]),
);
