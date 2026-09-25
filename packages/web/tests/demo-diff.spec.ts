import { rmSync } from "node:fs";
import { test, type Locator, type Page } from "@playwright/test";
import { createEvolutionRepository, startDiffServer } from "./diff-fixtures.ts";
import {
  PAUSE_LONG,
  PAUSE_MED,
  PAUSE_SHORT,
  centerAndClick,
  injectCursorOverlay,
} from "./demo-helpers.ts";

// ─── Architecture diff walkthrough ────────────────────────────────────────────
//
// This script is NOT a functional test — it is a choreographed walkthrough of
// how `arc42 serve --diff` visualizes the evolution of an architecture — the
// sequel to demo.spec.ts, which reads the same architecture at v1.0 —
// intended to be captured as a screen recording.
//
// The repository tells a short story on top of the bookstore example (see
// createEvolutionRepository): a new service, a technology change with a new
// decision, a formatting-only commit, a renamed section, and an uncommitted
// removal. The server compares the tag `v1.0` with the working tree.
//
// Run it with:   pnpm demo:diff
// The video is saved to test-results/ by Playwright's video capture, next to
// the screenshots of the key moments (01-…png, 02-…png, …).

function section(page: Page, name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

/** Scroll a locator to the upper part of the viewport, smoothly. */
async function scrollTo(page: Page, locator: Locator, pause = PAUSE_MED) {
  await locator.evaluate((element) =>
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY - 80,
      behavior: "smooth",
    }),
  );
  await page.waitForTimeout(pause);
}

test("arc42 serve --diff demo — architecture evolution", async ({ page }, testInfo) => {
  const root = createEvolutionRepository();
  const server = await startDiffServer(root, 3450, "v1.0");
  let shot = 0;
  const screenshot = async (name: string) => {
    shot++;
    await page.screenshot({
      path: testInfo.outputPath(`${String(shot).padStart(2, "0")}-${name}.png`),
    });
  };

  try {
    // ── 1. The Changes summary: what needs attention, what changed ─────────
    await page.goto(`${server.url}/`);
    await page.getByTestId("changes-view").waitFor({ state: "visible" });
    await injectCursorOverlay(page);
    await page.waitForTimeout(PAUSE_LONG);
    await screenshot("changes-summary");

    // ── 2. Open the changed Building Blocks chapter ────────────────────────
    await centerAndClick(
      page,
      page.getByTestId("diff-index-document-link").filter({ hasText: "Building Blocks" }),
      PAUSE_MED,
    );
    await page.getByTestId("chapter-diff").waitFor({ state: "visible" });
    await page.waitForTimeout(PAUSE_MED);

    // The overview diagram: only the changed lines of its source are marked.
    await scrollTo(
      page,
      section(page, "modified: Building Blocks").getByTestId("attribute-change"),
    );
    await page.waitForTimeout(PAUSE_MED);
    await screenshot("diagram-source");

    // ── 3. API Gateway: a new relation and one new phrase ───────────────────
    await scrollTo(page, section(page, "modified: API Gateway"), PAUSE_LONG);
    await screenshot("gateway-changes");

    // ── 4. Catalog Service: technology and prose rewritten ──────────────────
    const catalog = section(page, "modified: Catalog Service");
    await scrollTo(page, catalog, PAUSE_LONG);
    await screenshot("catalog-changes");
    await centerAndClick(page, catalog.getByRole("button", { name: "Previous" }));
    await page.waitForTimeout(PAUSE_MED);
    await centerAndClick(page, catalog.getByRole("button", { name: "Current" }));
    await page.waitForTimeout(PAUSE_MED);
    await centerAndClick(page, catalog.getByRole("button", { name: "Changes" }));
    await page.waitForTimeout(PAUSE_SHORT);

    // ── 5. A new service, a removed contract, a renamed section ────────────
    await scrollTo(page, section(page, "added: Recommendation Service"), PAUSE_LONG);
    await screenshot("added-service");
    await scrollTo(page, section(page, "removed: SMS Delivery Contract"), PAUSE_LONG);
    await scrollTo(page, section(page, "modified: Read Cache"), PAUSE_LONG);
    await screenshot("renamed-section");

    // ── 6. Back to the summary: a warning links straight to its element ────
    await centerAndClick(page, page.getByTestId("sidebar-changes-link"), PAUSE_SHORT);
    await page.getByTestId("diff-warnings").waitFor({ state: "visible" });
    await page.waitForTimeout(PAUSE_MED);
    await centerAndClick(
      page,
      page.getByTestId("diff-warnings").getByRole("link").first(),
      PAUSE_MED,
    );
    await page.locator("#el-bb-message-queue").waitFor({ state: "visible" });
    await page.waitForTimeout(PAUSE_LONG);
    await screenshot("warning-target");

    // ── 7. The history: one pearl per commit that touched the architecture ──
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(PAUSE_SHORT);
    await centerAndClick(page, page.getByTestId("sidebar-tab-history"), PAUSE_MED);
    await page.getByTestId("history-pearl").first().waitFor({ state: "visible" });
    await page.waitForTimeout(PAUSE_MED);

    const pearl = (subject: string) =>
      page.getByTestId("history-pearl").filter({ hasText: subject }).getByTestId("pearl-select");

    // A pearl opens that version of the architecture…
    await centerAndClick(page, pearl("feat: add book recommendations"), PAUSE_MED);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(PAUSE_LONG);
    await screenshot("history-feature-commit");

    // …with its commit message collapsed above the change: expand it to see why.
    await centerAndClick(page, page.getByTestId("commit-message-toggle"), PAUSE_MED);
    await page.getByTestId("commit-message").waitFor({ state: "visible" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(PAUSE_LONG);
    await screenshot("history-commit-message");

    await centerAndClick(page, pearl("perf: move catalog search to Go"), PAUSE_MED);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(PAUSE_LONG);
    await scrollTo(page, page.getByRole("region", { name: "added: Go for Catalog Search" }));
    await page.waitForTimeout(PAUSE_MED);
    await screenshot("history-decision");

    // A formatting-only commit is a small, neutral pearl: nothing changed in the model.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await centerAndClick(page, pearl("style: reflow the API Gateway section"), PAUSE_MED);
    await page.waitForTimeout(PAUSE_LONG);
    await screenshot("history-formatting-only");
  } finally {
    await server.stop();
    rmSync(root, { recursive: true, force: true });
  }
});
