import { test, expect, type Page } from "@playwright/test";

// These tests verify the arc42 serve web UI against whatever workspace the
// server is currently running (port 3142). They test behaviour, not content.

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getDocH1(page: Page): Promise<string> {
  return page.evaluate(() => document.querySelector("article h1")?.textContent ?? "");
}

async function getActiveHash(page: Page): Promise<string> {
  return page.evaluate(() => window.location.hash);
}

async function getActiveDocLabel(page: Page): Promise<string> {
  return page.evaluate(
    () => document.querySelector(".sidebar__doc-btn--active")?.textContent?.trim() ?? "",
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Document navigation", () => {
  test("loads first document on root URL", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article h1")).toBeVisible();
    // No hash means first document is shown
    expect(await getActiveHash(page)).toBe("");
    // Sidebar shows first doc as active
    const firstLink = page.locator(".sidebar__doc-btn--active");
    await expect(firstLink).toBeVisible();
  });

  test("clicking a sidebar link updates URL hash and shows correct document", async ({ page }) => {
    await page.goto("/");

    // Pick the building-blocks doc link
    const bbLink = page.getByRole("link", {
      name: "05-building-blocks",
      exact: true,
    });
    await bbLink.click();

    // URL hash should update
    expect(await getActiveHash(page)).toBe("#05-building-blocks.arc42.md");

    // Wait for the sidebar to mark the new doc as active
    await expect(page.locator(".sidebar__doc-btn--active")).toHaveText("05-building-blocks");

    // Content should switch — h1 should contain the doc title
    await expect(page.locator("article h1")).toBeVisible();
    const h1 = await getDocH1(page);
    expect(h1.length).toBeGreaterThan(0);
  });

  test("direct navigation via URL hash opens the correct document", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();

    // Sidebar should show this doc as active
    const label = await getActiveDocLabel(page);
    expect(label).toBe("05-building-blocks");

    // Hash should be set
    expect(await getActiveHash(page)).toBe("#05-building-blocks.arc42.md");
  });

  test("reloading the page preserves the active document", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();
    const h1Before = await getDocH1(page);

    await page.reload();
    await expect(page.locator("article h1")).toBeVisible();

    expect(await getActiveHash(page)).toBe("#05-building-blocks.arc42.md");
    expect(await getDocH1(page)).toBe(h1Before);
  });

  test("browser back restores previous document", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article h1")).toBeVisible();
    const firstH1 = await getDocH1(page);

    // Navigate to building-blocks
    await page.getByRole("link", { name: "05-building-blocks", exact: true }).click();
    await expect(page.locator("article h1")).toBeVisible();

    // Go back
    await page.goBack();
    await expect(page.locator("article h1")).toBeVisible();
    expect(await getDocH1(page)).toBe(firstH1);
  });

  test("heading links in the sidebar scroll within the active document", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();

    // Sidebar should show heading links for the active doc
    const headingLinks = page.locator(".sidebar__headings .sidebar__heading-link");
    await expect(headingLinks.first()).toBeVisible();
    const count = await headingLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a heading link does NOT change the document part of the hash", async ({
    page,
  }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();

    expect(await page.evaluate(() => window.location.hash)).toBe("#05-building-blocks.arc42.md");

    // Click the first heading link in the sidebar
    const firstHeadingLink = page.locator(".sidebar__headings .sidebar__heading-link").first();
    await expect(firstHeadingLink).toBeVisible();
    await firstHeadingLink.click();

    // Hash must now be "#05-building-blocks.arc42.md:<slug>" — not a bare "#slug"
    const hashAfter = await page.evaluate(() => window.location.hash);
    expect(hashAfter).toMatch(/^#05-building-blocks\.arc42\.md:/);

    // The document must not have switched
    const activeLabel = await page.evaluate(
      () => document.querySelector(".sidebar__doc-btn--active")?.textContent?.trim() ?? "",
    );
    expect(activeLabel).toBe("05-building-blocks");
  });
});

test.describe("Human / Agent view toggle", () => {
  test("human view shows coloured stripes for arc42 blocks", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator(".prose-run__stripe").first()).toBeVisible();
    // No raw agent blocks in human mode
    await expect(page.locator(".agent-block").first()).not.toBeVisible();
  });

  test("switching to agent view shows raw blocks and hides stripes", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator(".prose-run__stripe").first()).toBeVisible();

    // Toggle to agent view
    await page.getByRole("button", { name: "Human" }).click();

    // Stripes should be gone; agent blocks appear
    await expect(page.locator(".prose-run__stripe").first()).not.toBeVisible();
    await expect(page.locator(".agent-block").first()).toBeVisible();

    // Toggle button label changes
    await expect(page.getByRole("button", { name: "Agent" })).toBeVisible();
  });

  test("switching back from agent to human view restores stripes", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");

    await page.getByRole("button", { name: "Human" }).click();
    await expect(page.locator(".agent-block").first()).toBeVisible();

    await page.getByRole("button", { name: "Agent" }).click();
    await expect(page.locator(".prose-run__stripe").first()).toBeVisible();
    await expect(page.locator(".agent-block").first()).not.toBeVisible();
  });
});

test.describe("Stripe toggle (element card)", () => {
  test("clicking a stripe replaces prose with element card", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    const firstStripe = page.getByRole("button", { name: "Show element details" }).first();
    await expect(firstStripe).toBeVisible();

    // Find the parent prose-run container of the first stripe
    const firstProseRun = page.locator(".prose-run--has-block").first();

    // Before click: prose is visible, no card in this run
    await expect(firstProseRun.locator(".prose-run__prose-view")).toBeVisible();
    await expect(firstProseRun.locator(".element-card")).not.toBeVisible();

    // Click stripe
    await firstStripe.click();

    // After click: card is visible, prose is hidden — scoped to this run
    await expect(firstProseRun.locator(".prose-run__card-view")).toBeVisible();
    await expect(firstProseRun.locator(".element-card")).toBeVisible();
    await expect(firstProseRun.locator(".prose-run__prose-view")).not.toBeVisible();
  });

  test("clicking stripe again restores prose", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    const firstStripe = page.getByRole("button", { name: "Show element details" }).first();

    // Open
    await firstStripe.click();
    await expect(page.locator(".element-card").first()).toBeVisible();

    // Close
    const closeStripe = page.getByRole("button", { name: "Show prose" }).first();
    await closeStripe.click();
    await expect(page.locator(".prose-run__prose-view").first()).toBeVisible();
    await expect(page.locator(".element-card").first()).not.toBeVisible();
  });

  test("stripe turns active colour when card is shown", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    const firstStripe = page.getByRole("button", { name: "Show element details" }).first();

    expect(
      await page.evaluate(() => document.querySelector(".prose-run__stripe--active") !== null),
    ).toBe(false);

    await firstStripe.click();

    expect(
      await page.evaluate(() => document.querySelector(".prose-run__stripe--active") !== null),
    ).toBe(true);
  });
});

test.describe("API endpoint", () => {
  test("GET /api/workspace returns valid workspace JSON", async ({ request }) => {
    const resp = await request.get("/api/workspace");
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(Array.isArray(body.elements)).toBe(true);
    expect(Array.isArray(body.edges)).toBe(true);
    expect(Array.isArray(body.diagrams)).toBe(true);
    expect(Array.isArray(body.documents)).toBe(true);
    expect(body.documents.length).toBeGreaterThan(0);
    expect(body.elements.length).toBeGreaterThan(0);
  });
});
