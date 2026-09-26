/**
 * Architecture review of a change, for pull requests.
 *
 *   node --experimental-strip-types scripts/architecture-review.ts \
 *     --base <ref> --out <dir> [--cli <path>] <workspace>...
 *
 * For every workspace, lints the change from the merge base of <ref> and HEAD
 * (`arc42 diff <ref>...HEAD --format json`). Workspaces whose architecture
 * changed get a self-contained review page (`arc42 build --diff --single-file`)
 * written to <out>/<workspace-slug>.html. Also writes:
 *
 * - <out>/result.json — per workspace: changed, +/~/− counts, findings
 * - <out>/summary.md  — Markdown for a pull request comment / job summary;
 *   the placeholder {{ARTIFACT_URL}} stands for the download link of all pages
 *   (zipped), {{PAGE_URL:<page>}} for the link that opens one page directly
 *
 * With GITHUB_OUTPUT set, it also writes `changed=true|false` and
 * `pages=<JSON array of page file names>`.
 * Any failure of the CLI (other than lint findings) fails the script.
 */

import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const MARKER = "<!-- arc42-architecture-review -->";
const ARTIFACT_PLACEHOLDER = "{{ARTIFACT_URL}}";

/** Placeholder for the link that opens one review page in the browser. */
function pagePlaceholder(page: string): string {
  return `{{PAGE_URL:${page}}}`;
}

interface Finding {
  kind: string;
  severity: "warning" | "hint";
  file: string;
  line: number;
  message: string;
}

interface AttributeChange {
  name: string;
  before?: unknown;
  after?: unknown;
}

interface CodeChange {
  elementId: string;
  files: string[];
}

interface DiffOutput {
  base: { commit: string };
  findings: Finding[];
  groups: {
    warnings: Finding[];
    untouched: CodeChange[];
    updated: CodeChange[];
    uncovered: string[];
  };
  architecture: {
    elements: Array<{ id: string; kind: string; status: string; attributes: AttributeChange[] }>;
    diagrams: Array<{ id: string; status: string }>;
    edges: Array<{ status: string; edge: { from: string; relation: string; to: string } }>;
    proseSections: Array<{ status: string; section: { file: string; headingPath: string[] } }>;
    documents: Array<{ file: string; added: number; modified: number; removed: number }>;
  };
}

interface WorkspaceReview {
  workspace: string;
  changed: boolean;
  added: number;
  modified: number;
  removed: number;
  warnings: number;
  hints: number;
  /** File name of the review page inside --out, when the architecture changed. */
  page?: string;
  diff: DiffOutput;
}

function run(
  cli: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function slug(workspace: string): string {
  return workspace.replace(/^\.\/?/, "").replace(/[^\w.-]+/g, "-") || "workspace";
}

function reviewWorkspace(
  cli: string,
  workspace: string,
  range: string,
  out: string,
): WorkspaceReview {
  // Exit code 1 means blocking findings — expected for a review; the JSON tells.
  const diff = run(cli, ["--dir", workspace, "diff", range, "--format", "json"]);
  let parsed: DiffOutput;
  try {
    parsed = JSON.parse(diff.stdout) as DiffOutput;
  } catch {
    throw new Error(
      `arc42 diff failed for ${workspace} (exit ${diff.status}):\n${diff.stderr || diff.stdout}`,
    );
  }
  const architecture = parsed.architecture;
  const changed =
    architecture.elements.length > 0 ||
    architecture.diagrams.length > 0 ||
    architecture.edges.length > 0 ||
    architecture.proseSections.length > 0;
  const review: WorkspaceReview = {
    workspace,
    changed,
    added: architecture.documents.reduce((sum, d) => sum + d.added, 0),
    modified: architecture.documents.reduce((sum, d) => sum + d.modified, 0),
    removed: architecture.documents.reduce((sum, d) => sum + d.removed, 0),
    warnings: parsed.findings.filter((f) => f.severity === "warning").length,
    hints: parsed.findings.filter((f) => f.severity === "hint").length,
    diff: parsed,
  };
  if (!changed) return review;

  const site = mkdtempSync(join(tmpdir(), "arc42-review-"));
  try {
    const build = run(cli, [
      "--dir",
      workspace,
      "build",
      "--out",
      site,
      "--diff",
      range,
      "--single-file",
    ]);
    if (build.status !== 0) {
      throw new Error(
        `arc42 build failed for ${workspace} (exit ${build.status}):\n${build.stderr}`,
      );
    }
    review.page = `${slug(workspace)}.html`;
    copyFileSync(join(site, "index.html"), join(out, review.page));
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
  return review;
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  const text = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "string"
      ? value
      : JSON.stringify(value);
  return `\`${text.replaceAll("`", "'").replaceAll("|", "\\|")}\``;
}

function describeElements(review: WorkspaceReview): string[] {
  const lines: string[] = [];
  for (const element of review.diff.architecture.elements) {
    const status = element.status === "unchanged" ? "prose changed" : element.status;
    const attributes = element.attributes
      .map((a) => `${a.name}: ${formatValue(a.before)} → ${formatValue(a.after)}`)
      .join("; ");
    lines.push(
      `- \`${element.id}\` (${element.kind}) — ${status}${attributes ? ` — ${attributes}` : ""}`,
    );
  }
  for (const diagram of review.diff.architecture.diagrams) {
    lines.push(`- \`${diagram.id}\` (diagram) — ${diagram.status}`);
  }
  for (const change of review.diff.architecture.edges) {
    const { from, relation, to } = change.edge;
    lines.push(`- relation \`${from}\` ${relation} \`${to}\` — ${change.status}`);
  }
  for (const section of review.diff.architecture.proseSections) {
    const path = section.section.headingPath.join(" › ") || section.section.file;
    lines.push(`- section “${path}” — ${section.status}`);
  }
  return lines;
}

function codeChangeLine(change: CodeChange): string {
  return `- \`${change.elementId}\` — ${change.files.map((file) => `\`${file}\``).join(", ")}`;
}

function renderSummary(reviews: WorkspaceReview[], base: string): string {
  const changed = reviews.filter((review) => review.changed);
  if (changed.length === 0) {
    return `${MARKER}\n### Architecture review\n\nNo architecture changes compared with \`${base}\`.\n`;
  }
  const lines = [
    MARKER,
    "### Architecture review",
    "",
    `This change affects the architecture of **${changed.length}** workspace${changed.length === 1 ? "" : "s"} (compared with \`${base}\`).`,
    "",
    // The links come first and on their own lines: a wide table hides its last column on mobile.
    ...changed
      .map(
        (review) =>
          `**[Open the architecture review of \`${review.workspace}\`](${pagePlaceholder(review.page!)})** — the changes inside their chapters, in the browser`,
      )
      .flatMap((line) => [line, ""]),
    "| Workspace | Added | Modified | Removed | Warnings | Code changed, architecture untouched |",
    "|---|---:|---:|---:|---:|---:|",
    ...changed.map(
      (review) =>
        `| \`${review.workspace}\` | ${review.added} | ${review.modified} | ${review.removed} | ${review.diff.groups.warnings.length} | ${review.diff.groups.untouched.length} |`,
    ),
    "",
    `All review pages as a zip: [download](${ARTIFACT_PLACEHOLDER})`,
    "",
  ];
  for (const review of changed) {
    const { groups } = review.diff;
    lines.push(`#### \`${review.workspace}\``, "");
    if (groups.warnings.length > 0) {
      lines.push("**Warnings**", "");
      for (const f of groups.warnings) {
        lines.push(`- ${f.message} (\`${f.file}${f.line > 0 ? `:${f.line}` : ""}\`)`);
      }
      lines.push("");
    }
    if (groups.untouched.length > 0) {
      lines.push(
        "**Code changed, architecture untouched** — do these elements still describe the code?",
        "",
        ...groups.untouched.map(codeChangeLine),
        "",
      );
    }
    if (groups.uncovered.length > 0) {
      lines.push(
        "**Not covered by any building block**",
        "",
        ...groups.uncovered.map((path) => `- \`${path}\``),
        "",
      );
    }
    if (groups.updated.length > 0) {
      lines.push(
        `<details><summary>Code changed, element also updated in this change (${groups.updated.length})</summary>`,
        "",
        ...groups.updated.map(codeChangeLine),
        "",
        "</details>",
        "",
      );
    }
    const changes = describeElements(review);
    lines.push(
      `<details><summary>Changed elements, relations, diagrams and sections (${changes.length})</summary>`,
      "",
      ...changes,
      "",
      "</details>",
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      base: { type: "string" },
      out: { type: "string" },
      cli: { type: "string" },
    },
  });
  if (!values.base || !values.out || positionals.length === 0) {
    console.error(
      "Usage: architecture-review.ts --base <ref> --out <dir> [--cli <path>] <workspace>...",
    );
    process.exit(2);
  }
  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const cli = resolve(values.cli ?? join(repositoryRoot, "packages/cli/dist/cli.mjs"));
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });

  const range = `${values.base}...HEAD`;
  const reviews = positionals.map((workspace) => reviewWorkspace(cli, workspace, range, out));
  const changed = reviews.some((review) => review.changed);

  writeFileSync(join(out, "result.json"), `${JSON.stringify({ changed, reviews }, null, 2)}\n`);
  writeFileSync(join(out, "summary.md"), renderSummary(reviews, values.base));
  if (process.env["GITHUB_OUTPUT"]) {
    const pages = reviews.flatMap((review) => (review.page ? [review.page] : []));
    appendFileSync(
      process.env["GITHUB_OUTPUT"],
      `changed=${changed}\npages=${JSON.stringify(pages)}\n`,
    );
  }
  for (const review of reviews) {
    console.log(
      `${review.workspace}: ${review.changed ? `+${review.added} ~${review.modified} −${review.removed}, ${review.warnings} warnings, ${review.hints} hints → ${review.page}` : "no architecture changes"}`,
    );
  }
}

main();
