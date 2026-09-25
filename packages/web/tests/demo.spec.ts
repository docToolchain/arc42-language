import { rmSync } from "node:fs";
import { test, type Locator, type Page } from "@playwright/test";
import { createBookstoreRepository, startServer } from "./diff-fixtures.ts";
import {
  PAUSE_LONG,
  PAUSE_MED,
  PAUSE_SHORT,
  caption,
  centerAndClick,
  injectCaption,
  injectCursorOverlay,
} from "./demo-helpers.ts";

// ─── Reader walkthrough (prequel to the diff demo) ───────────────────────────
//
// This script is NOT a functional test — it is a choreographed walkthrough of
// reading an architecture with `arc42 serve`, intended to be captured as a
// screen recording (at most 90 s). Captions explain each step.
//
// It shows the bookstore architecture at `v1.0` — the state that the diff
// demo (demo-diff.spec.ts) then evolves.
//
// Run it with:   pnpm demo
// The video is saved to test-results/ by Playwright's video capture.

function chapter(page: Page, title: string): Locator {
  return page.getByTestId("sidebar-doc-link").filter({ hasText: title });
}

/** The colored stripe of the prose that describes an element. */
function stripeOf(page: Page, proseText: string): Locator {
  return page
    .locator("div", { has: page.getByTestId("prose-stripe") })
    .filter({ has: page.getByTestId("prose-view").filter({ hasText: proseText }) })
    .last()
    .getByTestId("prose-stripe");
}

/** Time to read a caption and look at what it points to. */
const READ = 3500;

async function scrollTo(page: Page, locator: Locator, pause = PAUSE_SHORT) {
  await locator.evaluate((element) =>
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY - 90,
      behavior: "smooth",
    }),
  );
  await page.waitForTimeout(pause);
}

test("arc42 serve demo — reading the bookstore architecture", async ({ page }) => {
  const root = createBookstoreRepository();
  const server = await startServer(root, 3460);
  try {
    // ── 1. The architecture as a readable document ─────────────────────────
    await page.goto(`${server.url}/`);
    await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible" });
    await injectCursorOverlay(page);
    await injectCaption(page);
    await caption(
      page,
      "An arc42 architecture — Markdown prose with typed blocks, rendered by arc42 serve",
      READ + PAUSE_MED,
    );

    // ── 2. Chapters and diagrams ────────────────────────────────────────────
    await centerAndClick(page, chapter(page, "5. Building Blocks"));
    await page.getByTestId("diagram").first().waitFor({ state: "visible" });
    await caption(page, "Each arc42 chapter is a page; diagrams render from the same source");
    await scrollTo(page, page.getByTestId("diagram").first(), READ);

    // ── 3. Prose describes elements; the stripe reveals them ────────────────
    const catalogStripe = stripeOf(page, "The Catalog Service owns all product data");
    await scrollTo(page, catalogStripe.locator("xpath=.."), PAUSE_SHORT);
    await caption(
      page,
      "A colored stripe marks prose that describes an architecture element",
      PAUSE_LONG,
    );
    await centerAndClick(page, catalogStripe, PAUSE_MED);
    const card = page.locator("#el-bb-catalog-service");
    await card.waitFor({ state: "visible" });
    await caption(
      page,
      "Click it to see the element: its typed attributes and its relations",
      READ + PAUSE_LONG,
    );

    // ── 4. Relations link across the documentation ─────────────────────────
    await caption(page, "Relations are links — follow one to the element it points to", PAUSE_LONG);
    await centerAndClick(
      page,
      card.getByTestId("element-ref-chip").filter({ hasText: "if-catalog-cache" }),
      PAUSE_MED,
    );
    await page.locator("#el-if-catalog-cache").waitFor({ state: "visible" });
    await page.waitForTimeout(READ);

    // ── 5. Decisions address quality goals ──────────────────────────────────
    await centerAndClick(page, chapter(page, "9. Architecture Decisions"));
    const redisStripe = stripeOf(page, "Catalog data changes on the order of hours");
    await scrollTo(page, redisStripe.locator("xpath=.."), PAUSE_SHORT);
    await caption(
      page,
      "Decisions are elements too — each names the quality goals it addresses",
      PAUSE_LONG,
    );
    await centerAndClick(page, redisStripe, PAUSE_SHORT);
    const decision = page.locator("#el-dec-redis-cache");
    await decision.waitFor({ state: "visible" });
    await page.waitForTimeout(READ);
    await centerAndClick(
      page,
      decision.getByTestId("element-ref-chip").filter({ hasText: "qg-performance" }),
      PAUSE_MED,
    );
    await page.locator("#el-qg-performance").waitFor({ state: "visible" });
    await caption(page, "…and lead straight to the goal, in its own chapter", READ);

    // ── 6. The same source, for agents ──────────────────────────────────────
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await centerAndClick(page, page.getByTestId("view-toggle"), PAUSE_SHORT);
    await page.getByTestId("agent-block").first().waitFor({ state: "visible" });
    await caption(
      page,
      "Agents read the same documentation — the typed blocks, verbatim",
      READ + PAUSE_LONG,
    );
    await centerAndClick(page, page.getByTestId("view-toggle"), PAUSE_SHORT);
    await page.getByTestId("prose-stripe").first().waitFor({ state: "visible" });

    // ── 7. Hand-over to the diff demo ───────────────────────────────────────
    await caption(
      page,
      "This is v1.0. Next: how arc42 serve --diff shows the architecture evolving",
      READ + PAUSE_LONG,
    );
  } finally {
    await server.stop();
    rmSync(root, { recursive: true, force: true });
  }
});
