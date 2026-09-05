import { test, type Page } from "./fixtures.ts";
import type { Locator } from "@playwright/test";

// ─── Demo walkthrough ─────────────────────────────────────────────────────────
//
// This script is NOT a functional test — it is a choreographed walkthrough of
// the bookstore-backend workspace intended to be captured as a screen recording.
//
// Run it with:   pnpm demo
// The video is saved to test-results/ by Playwright's video capture.
//
// Pause durations are generous so each step is clearly visible on camera.

const PAUSE_SHORT = 800; // brief beat between actions
const PAUSE_MED = 1500; // let the viewer read content
const PAUSE_LONG = 2500; // dwell on key moments

// ─── Cursor overlay ───────────────────────────────────────────────────────────
//
// Playwright's video capture doesn't include the OS cursor. We inject a real
// SVG arrow cursor image that tracks Playwright's mouse position via DOM events.
// The cursor SVG matches the standard macOS/Windows arrow pointer shape.

// Standard arrow cursor as an inline SVG data URI
const CURSOR_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 0 L4 20 L8 15 L13 24 L15 23 L10 14 L16 14 Z' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E") 4 0, auto`;

async function injectCursorOverlay(page: Page) {
  await page.addStyleTag({
    content: `
      /* Make the actual browser cursor visible as a custom SVG arrow */
      * { cursor: ${CURSOR_SVG} !important; }

      /* DOM overlay that mirrors the cursor position for the video */
      #pw-cursor {
        position: fixed;
        top: 0; left: 0;
        width: 24px; height: 24px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(0, 0);
        transition: left 0.04s linear, top 0.04s linear;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 0 L4 20 L8 15 L13 24 L15 23 L10 14 L16 14 Z' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-size: 24px 24px;
      }
      /* Click ripple ring */
      #pw-cursor-ring {
        position: fixed;
        top: 0; left: 0;
        width: 36px; height: 36px;
        border-radius: 50%;
        border: 2.5px solid rgba(255, 120, 0, 0.85);
        pointer-events: none;
        z-index: 2147483646;
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
        transition: transform 0.25s ease-out, opacity 0.25s ease-out;
      }
      #pw-cursor-ring.pw-cursor-ring--active {
        transform: translate(-50%, -50%) scale(1.4);
        opacity: 0;
      }
    `,
  });

  await page.evaluate(() => {
    // Arrow cursor dot
    const dot = document.createElement("div");
    dot.id = "pw-cursor";
    document.body.appendChild(dot);

    // Click ripple
    const ring = document.createElement("div");
    ring.id = "pw-cursor-ring";
    document.body.appendChild(ring);

    let cx = 0,
      cy = 0;

    document.addEventListener("mousemove", (e) => {
      cx = e.clientX;
      cy = e.clientY;
      dot.style.left = cx + "px";
      dot.style.top = cy + "px";
      ring.style.left = cx + "px";
      ring.style.top = cy + "px";
    });

    document.addEventListener("mousedown", () => {
      // Trigger ripple: remove class, force reflow, re-add
      ring.classList.remove("pw-cursor-ring--active");
      void ring.offsetWidth; // reflow
      ring.classList.add("pw-cursor-ring--active");
      setTimeout(() => ring.classList.remove("pw-cursor-ring--active"), 300);
    });
  });
}

// ─── scroll + move + click helper ────────────────────────────────────────────
//
// Before clicking an element:
//   1. Scroll it to the vertical center of the viewport
//   2. Move the Playwright mouse to the element center (animates cursor dot)
//   3. Pause briefly so the viewer can see where we're about to click
//   4. Click

async function centerAndClick(page: Page, locator: Locator, pause = PAUSE_SHORT) {
  // Scroll to center
  await locator.evaluate((el) =>
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }),
  );
  await page.waitForTimeout(400); // let scroll settle

  // Get element center in viewport coords
  const box = await locator.boundingBox();
  if (box !== null) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy, { steps: 20 }); // smooth move
  }

  await page.waitForTimeout(pause);
  await locator.click();
}

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
