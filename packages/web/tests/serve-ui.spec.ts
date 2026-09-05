import { test, expect, type Page } from "./fixtures.ts";
// Bookstore docs (in filesystem order, so loaded in this order by the server):
//   building-blocks.arc42.md   → "building-blocks" in sidebar
//   concepts.arc42.md          → "concepts"
//   decisions.arc42.md         → "decisions"
//   10-quality.arc42.md     → "quality-goals"
//
// Key elements used in tests:
//   bb-api-gateway    (building-blocks.arc42.md)
//   bb-catalog-service (building-blocks.arc42.md)
//   if-gateway-catalog (building-blocks.arc42.md) — between bb-api-gateway and bb-catalog-service
//   dec-rest-api      (decisions.arc42.md) — addresses qg-maintainability, qg-observability
//   qg-performance    (10-quality.arc42.md)

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getDocH1(page: Page): Promise<string> {
  return page.evaluate(() => document.querySelector("article h1")?.textContent ?? "");
}

async function getActiveHash(page: Page): Promise<string> {
  return page.evaluate(() => window.location.hash);
}

// ─── Document navigation ──────────────────────────────────────────────────────

test.describe("Document navigation", () => {
  test("loads first document on root URL", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article h1")).toBeVisible();
    expect(await getActiveHash(page)).toBe("");
    await expect(page.locator(".sidebar__doc-btn--active")).toBeVisible();
  });

  test("clicking a sidebar link updates URL hash and shows correct document", async ({ page }) => {
    await page.goto("/");

    const bbLink = page
      .getByTestId("sidebar-doc-link")
      .filter({ hasText: "building-blocks" })
      .first();
    await bbLink.click();

    expect(await getActiveHash(page)).toBe("#05-building-blocks.arc42.md");
    await expect(page.locator(".sidebar__doc-btn--active")).toHaveText(/building-blocks/);
    await expect(page.locator("article h1")).toBeVisible();
    const h1 = await getDocH1(page);
    expect(h1.length).toBeGreaterThan(0);
  });

  test("direct navigation via URL hash opens the correct document", async ({ page }) => {
    await page.goto("/#09-decisions.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();

    await expect(
      page
        .getByTestId("sidebar-doc-link")
        .filter({ hasText: /decisions/ })
        .first(),
    ).toHaveClass(/sidebar__doc-btn--active/);
    expect(await getActiveHash(page)).toBe("#09-decisions.arc42.md");
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

    await page.getByTestId("sidebar-doc-link").filter({ hasText: "decisions" }).first().click();
    await expect(page.locator("article h1")).toBeVisible();

    await page.goBack();
    await expect(page.locator("article h1")).toBeVisible();
    expect(await getDocH1(page)).toBe(firstH1);
  });

  test("heading links in the sidebar scroll within the active document", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();

    const headingLinks = page.locator("[data-testid='sidebar-heading-link']");
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

    const firstHeadingLink = page.locator("[data-testid='sidebar-heading-link']").first();
    await expect(firstHeadingLink).toBeVisible();
    await firstHeadingLink.click();

    const hashAfter = await page.evaluate(() => window.location.hash);
    expect(hashAfter).toMatch(/^#05-building-blocks\.arc42\.md:/);

    const activeLabel = await page.evaluate(
      () => document.querySelector(".sidebar__doc-btn--active")?.textContent?.trim() ?? "",
    );
    expect(activeLabel).toMatch(/building-blocks/);
  });
});

// ─── Human / Agent view toggle ────────────────────────────────────────────────

test.describe("Human / Agent view toggle", () => {
  test("human view shows coloured stripes for arc42 blocks", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.getByTestId("prose-stripe").first()).toBeVisible();
    await expect(page.locator(".agent-block").first()).not.toBeVisible();
  });

  test("switching to agent view shows raw blocks and hides stripes", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    await expect(page.getByTestId("prose-stripe").first()).toBeVisible();

    await page.getByRole("button", { name: "Human" }).click();

    await expect(page.getByTestId("prose-stripe").first()).not.toBeVisible();
    await expect(page.locator(".agent-block").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Agent" })).toBeVisible();
  });

  test("switching back from agent to human view restores stripes", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");

    await page.getByRole("button", { name: "Human" }).click();
    await expect(page.locator(".agent-block").first()).toBeVisible();

    await page.getByRole("button", { name: "Agent" }).click();
    await expect(page.getByTestId("prose-stripe").first()).toBeVisible();
    await expect(page.locator(".agent-block").first()).not.toBeVisible();
  });
});

// ─── Stripe toggle (element card) ─────────────────────────────────────────────

test.describe("Stripe toggle (element card)", () => {
  test("clicking a stripe replaces prose with element card", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    const firstStripe = page.getByTestId("prose-stripe").first();
    await expect(firstStripe).toBeVisible();

    await expect(page.locator(".prose-run--card-expanded")).not.toBeVisible();

    await firstStripe.click();

    const expanded = page.locator(".prose-run--card-expanded").first();
    await expect(expanded).toBeVisible();
    await expect(expanded.locator(".element-card")).toBeVisible();
    await expect(expanded.locator(".prose-run__prose-view")).not.toBeVisible();
  });

  test("clicking stripe again restores prose", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    const firstStripe = page.getByTestId("prose-stripe").first();

    await firstStripe.click();
    const expanded = page.locator(".prose-run--card-expanded").first();
    await expect(expanded.locator(".element-card")).toBeVisible();

    const dismissStripe = page.getByTestId("card-dismiss-stripe").first();
    await dismissStripe.click();
    await expect(page.locator(".prose-run__prose-view").first()).toBeVisible();
    await expect(page.locator(".prose-run--card-expanded").first()).not.toBeVisible();
  });

  test("dismiss stripe is visible on the element card when card is shown", async ({ page }) => {
    await page.goto("/#05-building-blocks.arc42.md");
    const firstStripe = page.getByTestId("prose-stripe").first();

    await expect(page.getByTestId("card-dismiss-stripe")).not.toBeVisible();
    await firstStripe.click();
    await expect(page.getByTestId("card-dismiss-stripe").first()).toBeVisible();
  });
});

// ─── Cross-document element card links ────────────────────────────────────────

test.describe("Cross-document element card links", () => {
  // dec-rest-api (decisions.arc42.md) addresses qg-maintainability and
  // qg-observability, which live in 10-quality.arc42.md.
  // The ref chips must include the target doc filename in their href.

  test("ref chip href includes the target document filename", async ({ page }) => {
    await page.goto("/#09-decisions.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();

    // Open the first element card (dec-rest-api)
    const firstStripe = page.getByTestId("prose-stripe").first();
    await expect(firstStripe).toBeVisible();
    await firstStripe.click();

    const card = page.locator(".prose-run--card-expanded .element-card").first();
    await expect(card).toBeVisible();

    // At least one ref chip must reference 10-quality.arc42.md
    const refChips = card.locator("[data-testid='element-ref-chip']");
    await expect(refChips.first()).toBeVisible();

    const hrefs = await refChips.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).href),
    );

    const crossDocHref = hrefs.find((h) => h.includes("10-quality.arc42.md"));
    expect(
      crossDocHref,
      `Expected at least one ref chip to link to 10-quality.arc42.md, got: ${JSON.stringify(hrefs)}`,
    ).toBeTruthy();
  });

  test("clicking a cross-document ref chip navigates to the target document", async ({ page }) => {
    await page.goto("/#09-decisions.arc42.md");
    const firstStripe = page.getByTestId("prose-stripe").first();
    await firstStripe.click();

    const card = page.locator(".prose-run--card-expanded .element-card").first();
    await expect(card).toBeVisible();

    // Find the chip pointing to 10-quality.arc42.md
    const refChips = card.locator("[data-testid='element-ref-chip']");
    const hrefs = await refChips.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).href),
    );
    const targetIdx = hrefs.findIndex((h) => h.includes("10-quality.arc42.md"));
    expect(targetIdx).toBeGreaterThanOrEqual(0);

    await refChips.nth(targetIdx).click();

    // Sidebar should now show quality-goals as active
    await expect(page.locator(".sidebar__doc-btn--active")).toHaveText(/quality/);
    expect(await getActiveHash(page)).toContain("10-quality.arc42.md");
  });

  test("clicking a cross-document ref chip auto-expands the target element card", async ({
    page,
  }) => {
    await page.goto("/#09-decisions.arc42.md");
    const firstStripe = page.getByTestId("prose-stripe").first();
    await firstStripe.click();

    const card = page.locator(".prose-run--card-expanded .element-card").first();
    await expect(card).toBeVisible();

    // Get the href of the first cross-doc chip (e.g. qg-maintainability in quality-goals)
    const refChips = card.locator("[data-testid='element-ref-chip']");
    const hrefs = await refChips.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).href),
    );
    const targetHref = hrefs.find((h) => h.includes("10-quality.arc42.md"));
    expect(targetHref).toBeTruthy();

    // Extract the element id from the href: #10-quality.arc42.md:el-qg-xxx
    const match = targetHref!.match(/:el-([^&]+)$/);
    expect(match).toBeTruthy();
    const targetId = match![1]!;

    await refChips.nth(hrefs.indexOf(targetHref!)).click();

    // The target doc is shown
    await expect(page.locator(".sidebar__doc-btn--active")).toHaveText(/quality/);

    // The target element card must be auto-expanded and visible
    const expandedCard = page.locator(`#el-${targetId}`);
    await expect(expandedCard).toBeVisible({ timeout: 3000 });
  });
});

// ─── API endpoint ─────────────────────────────────────────────────────────────

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
