import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import type { Plugin } from "vite-plus";
// gray-matter ships CJS only; use createRequire so the ESM build can consume it
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require("gray-matter") as typeof import("gray-matter");

export interface Verdict {
  slug: string;
  model: string;
  harness: string;
  agent: string;
  date: string;
  task: string;
  version: string;
  title: string;
  tldr: string;
}

const VIRTUAL_ID = "virtual:verdicts";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

function extractTldr(body: string): string {
  // Find ## TL;DR section and extract text until next heading
  const match = body.match(/##\s+TL;DR\s*\n([\s\S]*?)(?=\n##\s|\s*$)/);
  if (!match) return "";
  const raw = match[1].trim();
  // Take first two sentences (split on ". " but keep abbreviations like `arc42`)
  const sentences = raw.split(/(?<=[.!?])\s+(?=[A-Z`"])/);
  return sentences.slice(0, 2).join(" ").trim();
}

function loadVerdicts(dir: string): Verdict[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  return files.map((file) => {
    const raw = readFileSync(join(dir, file), "utf8");
    const { data, content } = matter(raw) as { data: Record<string, string>; content: string };
    const slug = basename(file, ".md");

    // Extract H1 title from content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    return {
      slug,
      model: String(data["model"] ?? ""),
      harness: String(data["harness"] ?? ""),
      agent: String(data["agent"] ?? ""),
      date: String(data["date"] ?? ""),
      task: String(data["task"] ?? ""),
      version: String(data["version"] ?? ""),
      title,
      tldr: extractTldr(content),
    };
  });
}

export function verdictsPlugin(verdictsDir: string): Plugin {
  return {
    name: "vite-plugin-verdicts",
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id: string) {
      if (id !== RESOLVED_ID) return;
      const verdicts = loadVerdicts(verdictsDir);
      return `export const verdicts = ${JSON.stringify(verdicts)};`;
    },
  };
}
