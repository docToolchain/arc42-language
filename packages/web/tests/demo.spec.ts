import { test } from "./fixtures.ts";
import {
  PAUSE_LONG,
  PAUSE_MED,
  PAUSE_SHORT,
  centerAndClick,
  injectCursorOverlay,
} from "./demo-helpers.ts";

// ─── Demo walkthrough ─────────────────────────────────────────────────────────
//
// This script is NOT a functional test — it is a choreographed walkthrough of
// the bookstore-backend workspace intended to be captured as a screen recording.
//
// Run it with:   pnpm demo
// The video is saved to test-results/ by Playwright's video capture.
//
// Pause durations are generous so each step is clearly visible on camera.

// ─── Demo test ────────────────────────────────────────────────────────────────

test("arc42 serve demo — bookstore backend", async ({ page }) => {
  // ── 1. Load the app ────────────────────────────────────────────────────────
  await page.goto("/");
  await page.locator("article h1").waitFor({ state: "visible" });
  await injectCursorOverlay(page);
  await page.waitForTimeout(PAUSE_LONG);

  // ── 2. Navigate to Building Blocks ────────────────────────────────────────
  await centerAndClick(page, page.getByRole("link", { name: "building-blocks", exact: true }));
  await page.locator("article h1").waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_LONG);

  // ── 3. Smooth scroll to show elements below the fold ─────────────────────
  await page.evaluate(() => window.scrollTo({ top: 250, behavior: "smooth" }));
  await page.waitForTimeout(PAUSE_MED);

  // ── 4. Click first stripe → expand API Gateway card ──────────────────────
  const firstStripe = page.getByRole("button", { name: "Show element details" }).first();
  await centerAndClick(page, firstStripe, PAUSE_MED);
  await page
    .locator(".prose-run--card-expanded .element-card")
    .first()
    .waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_LONG);

  // ── 5. Hover over ref chips, then click the first one ─────────────────────
  const refChips = page.locator(".prose-run--card-expanded .element-card__ref-chip");
  const count = await refChips.count();
  if (count > 0) {
    // Hover over first chip
    const box = await refChips.first().boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
    await page.waitForTimeout(PAUSE_SHORT);
    await centerAndClick(page, refChips.first());
    await page.waitForTimeout(PAUSE_LONG);
  }

  // ── 6. Dismiss back to prose ──────────────────────────────────────────────
  const dismissStripe = page.getByRole("button", { name: "Collapse element card" }).first();
  if (await dismissStripe.isVisible()) {
    await centerAndClick(page, dismissStripe, PAUSE_SHORT);
    await page.waitForTimeout(PAUSE_SHORT);
  }

  // ── 7. Navigate to Decisions ─────────────────────────────────────────────
  await centerAndClick(page, page.getByRole("link", { name: "decisions", exact: true }));
  await page.locator("article h1").waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_MED);

  // ── 8. Open dec-rest-api card ─────────────────────────────────────────────
  const decStripe = page.getByRole("button", { name: "Show element details" }).first();
  await centerAndClick(page, decStripe, PAUSE_MED);
  await page
    .locator(".prose-run--card-expanded .element-card")
    .first()
    .waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_LONG);

  // ── 9. Click a cross-doc chip → quality-goals + auto-expand ──────────────
  const decRefChips = page.locator(".prose-run--card-expanded .element-card__ref-chip");
  const hrefs = await decRefChips.evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).href),
  );
  const crossDocIdx = hrefs.findIndex((h) => h.includes("quality-goals.arc42.md"));
  if (crossDocIdx >= 0) {
    // Hover first, then click
    const chip = decRefChips.nth(crossDocIdx);
    const chipBox = await chip.boundingBox();
    if (chipBox !== null) {
      await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2, {
        steps: 15,
      });
    }
    await page.waitForTimeout(PAUSE_SHORT);
    await centerAndClick(page, chip);
    await page.locator(".sidebar__doc-btn--active").waitFor({ state: "visible" });
    await page.waitForTimeout(PAUSE_LONG);

    // Scroll to and dwell on the auto-expanded target card
    const expandedCard = page.locator(".prose-run--card-expanded .element-card").first();
    if (await expandedCard.isVisible()) {
      await expandedCard.evaluate((el) =>
        el.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      await page.waitForTimeout(PAUSE_LONG);
    }
  }

  // ── 10. Toggle to Agent view ──────────────────────────────────────────────
  await centerAndClick(page, page.getByRole("link", { name: "building-blocks", exact: true }));
  await page.locator("article h1").waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_MED);

  await centerAndClick(page, page.getByRole("button", { name: "Human" }));
  await page.locator(".agent-block").first().waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_LONG);

  // ── 11. Toggle back to Human view ────────────────────────────────────────
  await centerAndClick(page, page.getByRole("button", { name: "Agent" }));
  await page.locator(".prose-run__stripe").first().waitFor({ state: "visible" });
  await page.waitForTimeout(PAUSE_LONG);
});
