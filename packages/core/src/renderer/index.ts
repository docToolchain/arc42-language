import type { GetRenderer } from "./types.ts";
import { TextGetRenderer } from "./text.ts";
import { JsonGetRenderer } from "./json.ts";

const textRenderer = new TextGetRenderer();
const jsonRenderer = new JsonGetRenderer();

export const builtinGetRenderers: readonly GetRenderer[] = [textRenderer, jsonRenderer];
export const rendererById: ReadonlyMap<string, GetRenderer> = new Map(
  builtinGetRenderers.map((r) => [r.meta.id, r]),
);
