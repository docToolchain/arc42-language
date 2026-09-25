import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createDiffRepository,
  createHistoryRepository,
  expect,
  runCli,
  test,
  type Page,
} from "./diff-fixtures.ts";

// Black-box tests of `arc42 build --single-file`: one HTML file, opened from disk.

function build(root: string, ...args: string[]): string {
  const out = mkdtempSync(join(tmpdir(), "arc42-e2e-single-file-"));
  runCli("--dir", root, "build", "--out", out, "--single-file", ...args);
  return out;
}

/** Open the page from disk and record every request that is not the page itself. */
async function openFromDisk(page: Page, out: string, hash = ""): Promise<string[]> {
  const pageUrl = pathToFileURL(join(out, "index.html")).href;
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().split("#")[0] !== pageUrl) requests.push(request.url());
  });
  await page.goto(`${pageUrl}${hash}`);
  return requests;
}

test.describe("arc42 build --single-file", () => {
  test("writes one self-contained page that renders the documentation", async ({
    page,
    diffRepository,
  }) => {
    const out = build(diffRepository);
    try {
      expect(readdirSync(out)).toEqual(["index.html"]);
      const html = readFileSync(join(out, "index.html"), "utf8");
      expect(html).not.toMatch(/src="\/assets\/|href="\/assets\//);

      const requests = await openFromDisk(page, out);
      await expect(page.locator("article h1")).toBeVisible();
      await expect(page.getByTestId("sidebar-doc-link")).toHaveCount(12);
      expect(requests).toEqual([]);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("includes a difference", async ({ page }) => {
    const root = createDiffRepository();
    const out = build(root, "--diff");
    try {
      await openFromDisk(page, out);
      await expect(page.getByTestId("changes-view")).toBeVisible();
      await expect(page.getByTestId("diff-segment")).toHaveCount(4);
    } finally {
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("inlines the history instead of writing history/", async ({ page }) => {
    const root = createHistoryRepository();
    const out = build(root, "--with-history");
    try {
      expect(readdirSync(out)).toEqual(["index.html"]);
      const requests = await openFromDisk(page, out, "#history");
      const pearls = page.getByTestId("history-pearl");
      await expect(pearls).toHaveCount(4);
      await expect(pearls.nth(1)).toHaveAttribute("data-state", "empty");
      await pearls.nth(2).getByRole("button").click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "feat: switch the catalog to Go",
      );
      await expect(pearls.nth(2).getByTestId("pearl-message").locator("strong")).toHaveText(
        "p95 search latency",
      );
      await expect(page.getByTestId("diff-segment")).toHaveCount(4);
      expect(requests).toEqual([]);
    } finally {
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });
});
