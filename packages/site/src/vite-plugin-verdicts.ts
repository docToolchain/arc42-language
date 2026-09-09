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

function formatDate(raw: unknown): string {
  if (!raw) return "";
  // gray-matter auto-parses ISO date strings into JS Date objects (UTC midnight).
  // Use toISOString() to stay in UTC and avoid local-timezone shift.
  if (raw instanceof Date) return raw.toISOString().slice(0, 10).replace(/-/g, "/");
  return String(raw);
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
      date: formatDate(data["date"]),
      task: String(data["task"] ?? ""),
      version: String(data["version"] ?? ""),
      title,
      tldr: extractTldr(content),
    };
  });
}

export function verdictsPlugin(verdictsDir: string): Plugin {
  // README is at the monorepo root, two levels above packages/site/src/
  const readmePath = join(verdictsDir, "../../README.md");

  return {
    name: "vite-plugin-verdicts",
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      if (id === "virtual:readme") return "\0virtual:readme";
    },
    load(id: string) {
      if (id === RESOLVED_ID) {
        const verdicts = loadVerdicts(verdictsDir);
        return `export const verdicts = ${JSON.stringify(verdicts)};`;
      }
      if (id === "\0virtual:readme") {
        const raw = readFileSync(readmePath, "utf8");
        // Keep only the "For architects" section (before "For contributors")
        const architectsMatch = raw.match(
          /## For architects\n([\s\S]*?)(?=\n## For contributors|$)/,
        );
        const content = architectsMatch
          ? architectsMatch[1].trim()
          : raw
              .replace(/^#[^\n]*\n/, "")
              .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)\n?/g, "")
              .trim();
        return `export const readmeContent = ${JSON.stringify(content)};`;
      }
    },
  };
}
