import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHistoryRepository, expect, test } from "./diff-fixtures.ts";

// Black-box tests of scripts/architecture-review.ts, the core of the pull request workflow.

const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/architecture-review.ts",
);

function review(root: string, base: string, out: string, env: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", script, "--base", base, "--out", out, "."],
    { cwd: root, encoding: "utf8", env: { ...process.env, ...env } },
  );
}

test.describe("architecture review script", () => {
  let root: string;
  let out: string;

  test.beforeEach(() => {
    root = createHistoryRepository();
    out = mkdtempSync(join(tmpdir(), "arc42-e2e-review-"));
  });

  test.afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  });

  test("renders a review page and a comment for an architecture change", async ({ page }) => {
    const githubOutput = join(out, "github-output");
    writeFileSync(githubOutput, "");
    // The branch under review: the two commits after "initial architecture".
    const result = review(root, "HEAD~2", out, { GITHUB_OUTPUT: githubOutput });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(githubOutput, "utf8")).toBe("changed=true\n");

    const summary = JSON.parse(readFileSync(join(out, "result.json"), "utf8")) as {
      changed: boolean;
      reviews: Array<{ workspace: string; changed: boolean; warnings: number; page?: string }>;
    };
    expect(summary.changed).toBe(true);
    expect(summary.reviews).toMatchObject([
      { workspace: ".", changed: true, warnings: 1, page: "workspace.html" },
    ]);

    const comment = readFileSync(join(out, "summary.md"), "utf8");
    expect(comment.startsWith("<!-- arc42-architecture-review -->\n")).toBe(true);
    expect(comment).toContain("| `.` | 1 | 2 | 1 | 1 warning");
    expect(comment).toContain("[Download the rendered architecture review]({{ARTIFACT_URL}})");
    expect(comment).toContain(
      "- `bb-catalog-service` (building-block) — modified — technology: `Node.js / Express` → `Go`",
    );
    expect(comment).toContain("- `if-notify-sms` (interface) — removed");
    expect(comment).toContain(
      "- warning: Block 'bb-catalog-service' changed without changing its section prose.",
    );

    // The review page is self-contained: open it from disk.
    await page.goto(pathToFileURL(join(out, "workspace.html")).href);
    await expect(page.getByTestId("changes-view")).toBeVisible();
    await expect(page.getByTestId("diff-segment")).toHaveCount(4);
  });

  test("reports no change without a review page", () => {
    const githubOutput = join(out, "github-output");
    writeFileSync(githubOutput, "");
    // Uncommitted changes are not part of a pull request.
    const result = review(root, "HEAD", out, { GITHUB_OUTPUT: githubOutput });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(githubOutput, "utf8")).toBe("changed=false\n");
    expect(readFileSync(join(out, "summary.md"), "utf8")).toBe(
      "<!-- arc42-architecture-review -->\n### Architecture review\n\nNo architecture changes compared with `HEAD`.\n",
    );
    expect(existsSync(join(out, "workspace.html"))).toBe(false);
  });

  test("fails when the change cannot be computed", () => {
    const result = review(root, "no-such-branch", out);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("arc42 diff failed for .");
  });
});
