// Shared helpers for the demo walkthroughs (screen recordings, not functional tests).

import type { Locator, Page } from "@playwright/test";

export const PAUSE_SHORT = 800; // brief beat between actions
export const PAUSE_MED = 1500; // let the viewer read content
export const PAUSE_LONG = 2500; // dwell on key moments

// ─── Cursor overlay ───────────────────────────────────────────────────────────
//
// Playwright's video capture doesn't include the OS cursor. We inject a real
// SVG arrow cursor image that tracks Playwright's mouse position via DOM events.
// The cursor SVG matches the standard macOS/Windows arrow pointer shape.

// Standard arrow cursor as an inline SVG data URI
const CURSOR_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 0 L4 20 L8 15 L13 24 L15 23 L10 14 L16 14 Z' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E") 4 0, auto`;

export async function injectCursorOverlay(page: Page) {
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

export async function centerAndClick(page: Page, locator: Locator, pause = PAUSE_SHORT) {
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
