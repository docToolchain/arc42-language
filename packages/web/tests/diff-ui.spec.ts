import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import {
  BB,
  createDiffRepository,
  expect,
  runCli,
  startDiffServer,
  test,
  type Page,
} from "./diff-fixtures.ts";

// Black-box UI tests of the architecture diff view (serve --diff / build --diff).

function segment(page: Page, name: string) {
  return page.getByRole("region", { name });
}

test.describe("Changes view", () => {
  test("opens by default and summarizes the difference", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("changes-view")).toBeVisible();
    await expect(page.getByTestId("changes-range")).toHaveText(/index\s*→?\s*(to)?\s*working tree/);
    const changesLink = page.getByTestId("sidebar-changes-link");
    await expect(changesLink).toHaveAttribute("aria-current", "page");
    await expect(changesLink).toContainText("+1");
    await expect(changesLink).toContainText("~2");
    await expect(changesLink).toContainText("−1");
  });

  test("lists lint findings", async ({ page }) => {
    await page.goto("/#changes");
    await expect(page.getByTestId("diff-finding")).toContainText([
      "Block 'bb-catalog-service' changed without changing its section prose.",
    ]);
  });

  test("renders changed segments per document with their status", async ({ page }) => {
    await page.goto("/#changes");
    const documents = page.getByTestId("diff-document");
    await expect(documents).toHaveCount(2);
    await expect(page.getByTestId("diff-document-title")).toHaveText([
      "Building Blocks",
      "Glossary",
    ]);

    await expect(segment(page, "modified: Catalog Service")).toBeVisible();
    await expect(segment(page, "removed: SMS Delivery Contract")).toBeVisible();
    await expect(segment(page, "modified: Glossary")).toBeVisible();
    await expect(segment(page, "added: Idempotency Key")).toBeVisible();
  });

  test("shows attribute changes with old and new values", async ({ page }) => {
    await page.goto("/#changes");
    const row = segment(page, "modified: Catalog Service").getByTestId("attribute-change");
    await expect(row).toHaveCount(1);
    await expect(row.locator("th")).toHaveText("technology");
    await expect(row.locator("td").nth(0)).toHaveText("Node.js / Express");
    await expect(row.locator("td").nth(1)).toHaveText("Go");
  });

  test("renders section content from the matching snapshot", async ({ page }) => {
    await page.goto("/#changes");
    await expect(segment(page, "added: Idempotency Key").getByTestId("segment-head")).toContainText(
      "A client-chosen key that makes retried order submissions safe.",
    );
    await expect(
      segment(page, "removed: SMS Delivery Contract").getByTestId("segment-base"),
    ).toContainText(
      "The Notification Service provides the contract for transactional SMS delivery.",
    );
    // A literal "</script>" in the prose is rendered as text.
    await expect(segment(page, "modified: Glossary").getByTestId("segment-head")).toContainText(
      "</script>",
    );
  });

  test("reveals the previous version of a modified section", async ({ page }) => {
    await page.goto("/#changes");
    const glossary = segment(page, "modified: Glossary");
    await expect(glossary.getByTestId("segment-base")).toHaveCount(0);
    await glossary.getByTestId("toggle-base").click();
    await expect(glossary.getByTestId("toggle-base")).toHaveAttribute("aria-expanded", "true");
    const previous = glossary.getByTestId("segment-base");
    await expect(previous).toContainText("share the same understanding.");
    await expect(previous).not.toContainText("</script>");
  });

  test("marks changed documents in the sidebar and navigates between views", async ({ page }) => {
    await page.goto("/#changes");
    const building = page.getByTestId("sidebar-doc-link").filter({ hasText: "5. Building Blocks" });
    await expect(building.getByTestId("doc-change-badge")).toHaveText("~1−1");
    const intro = page.getByTestId("sidebar-doc-link").filter({ hasText: "1. Introduction" });
    await expect(intro.getByTestId("doc-change-badge")).toHaveCount(0);

    await building.click();
    await expect(page).toHaveURL(new RegExp(`#${BB.replaceAll(".", "\\.")}$`));
    await expect(page.getByTestId("changes-view")).toHaveCount(0);
    await expect(page.locator("article h1")).toHaveText("Building Blocks");

    await page.getByTestId("sidebar-changes-link").click();
    await expect(page.getByTestId("changes-view")).toBeVisible();
  });
});

test.describe("Changes view — live updates", () => {
  test("follows edits, reports an empty difference and surfaces errors", async ({ page }) => {
    const root = createDiffRepository();
    const server = await startDiffServer(root, 3392);
    try {
      await page.goto(`${server.url}/`);
      await expect(page.getByTestId("diff-segment")).toHaveCount(4);

      spawnSync("git", ["-C", root, "add", "-A"]);
      await expect(page.getByTestId("changes-empty")).toBeVisible({ timeout: 10000 });

      // A duplicate id makes the working tree impossible to diff.
      const glossary = join(root, "12-glossary.arc42.md");
      writeFileSync(
        glossary,
        `${readFileSync(glossary, "utf8")}\n## Copy\n\nA copy.\n\n\`\`\`arc42\n:::glossary-term\nid: term-jwt\ntitle: Copy\ndefinition: Duplicate.\n:::\n\`\`\`\n`,
      );
      await expect(page.getByTestId("diff-error")).toContainText("Duplicate id 'term-jwt'", {
        timeout: 10000,
      });
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe("Changes view — static build", () => {
  let site: Server | undefined;
  let out: string | undefined;

  test.afterEach(async () => {
    await new Promise<void>((resolve) => (site ? site.close(() => resolve()) : resolve()));
    if (out) rmSync(out, { recursive: true, force: true });
  });

  test("renders the difference frozen into build --diff", async ({ page, diffRepository }) => {
    out = mkdtempSync(join(tmpdir(), "arc42-e2e-diff-site-"));
    runCli("--dir", diffRepository, "build", "--out", out, "--diff");
    const root = out;
    const types: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
    };
    site = createServer((req, res) => {
      const path = join(root, (req.url ?? "/").split("?")[0] === "/" ? "index.html" : req.url!);
      if (!existsSync(path)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
      res.end(readFileSync(path));
    });
    await new Promise<void>((resolve) => site!.listen(3393, "127.0.0.1", resolve));

    await page.goto("http://127.0.0.1:3393/");
    await expect(page.getByTestId("changes-view")).toBeVisible();
    await expect(page.getByTestId("diff-segment")).toHaveCount(4);
    await expect(segment(page, "added: Idempotency Key")).toBeVisible();
  });
});
