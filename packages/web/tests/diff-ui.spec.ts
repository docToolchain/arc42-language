import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BB,
  createDiffRepository,
  expect,
  runCli,
  serveStatic,
  startDiffServer,
  test,
  type Page,
} from "./diff-fixtures.ts";

// Black-box UI tests of the architecture diff view (serve --diff / build --diff).

function segment(page: Page, name: string) {
  return page.getByRole("region", { name });
}

const GLOSSARY_FILE = "12-glossary.arc42.md";

function sectionOrder(page: Page) {
  // Labels of every section of the chapter, in document order.
  return page
    .getByTestId("chapter-diff")
    .locator('[data-testid="diff-segment"], [data-testid="unchanged-section"]')
    .evaluateAll((sections) =>
      sections.map(
        (section) =>
          section.getAttribute("aria-label") ??
          section.querySelector("h1, h2, h3, h4")?.textContent ??
          "",
      ),
    );
}

test.describe("Changes summary", () => {
  test("opens by default and summarizes the difference", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("changes-view")).toBeVisible();
    await expect(page.getByTestId("changes-range")).toHaveText(/index\s*→?\s*(to)?\s*working tree/);
    const changesLink = page.getByTestId("sidebar-changes-link");
    await expect(changesLink).toHaveAttribute("aria-current", "page");
    await expect(changesLink).toContainText("+1");
    await expect(changesLink).toContainText("~2");
    await expect(changesLink).toContainText("−1");
    // The summary does not render section content; that lives in the chapters.
    await expect(page.getByTestId("diff-segment")).toHaveCount(0);
  });

  test("lists warnings that link to their element in the chapter", async ({ page }) => {
    await page.goto("/#changes");
    const warning = page.getByTestId("diff-warnings").getByTestId("diff-finding");
    await expect(warning).toContainText([
      "Block 'bb-catalog-service' changed without changing its section prose.",
    ]);
    await warning.getByRole("link").click();
    await expect(page).toHaveURL(/#05-building-blocks\.arc42\.md:el-bb-catalog-service$/);
    await expect(page.getByTestId("chapter-diff")).toBeVisible();
    await expect(page.locator("#el-bb-catalog-service")).toBeVisible();
  });

  test("indexes the changed chapters and elements", async ({ page }) => {
    await page.goto("/#changes");
    const documents = page.getByTestId("diff-index-document");
    await expect(documents).toHaveCount(2);
    await expect(documents.nth(0).getByTestId("diff-index-item")).toHaveText([
      "bb-catalog-service",
      "if-notify-sms",
    ]);
    await expect(documents.nth(1).getByTestId("diff-index-item")).toHaveText([
      "§ Glossary",
      "term-idempotency-key",
    ]);
    await documents.nth(1).getByTestId("diff-index-document-link").click();
    await expect(page).toHaveURL(new RegExp(`#${GLOSSARY_FILE.replaceAll(".", "\\.")}$`));
    await expect(page.getByTestId("chapter-diff")).toHaveAttribute("data-file", GLOSSARY_FILE);
  });
});

test.describe("Changes inline in the chapters", () => {
  test("renders a changed chapter in full with its changes in place", async ({ page }) => {
    await page.goto(`/#${BB}`);
    const chapter = page.getByTestId("chapter-diff");
    await expect(chapter).toBeVisible();
    // Unchanged sections are rendered from the document, not as placeholders.
    await expect(page.getByTestId("section-skeleton")).toHaveCount(0);
    await expect(chapter).toContainText(
      "The gateway is the single entry point for all external traffic.",
    );

    const order = await sectionOrder(page);
    const at = (label: string) => order.indexOf(label);
    expect(at("modified: Catalog Service")).toBeGreaterThan(at("API Gateway"));
    // The removed section appears where it used to be: after the e-mail contract.
    expect(at("removed: SMS Delivery Contract")).toBe(at("Email Delivery Contract") + 1);
  });

  test("shows attribute changes and the previous version of a modified section", async ({
    page,
  }) => {
    await page.goto(`/#${BB}`);
    const catalog = segment(page, "modified: Catalog Service");
    // The section status reads apart from the status of the elements inside it.
    await expect(catalog.getByTestId("segment-status")).toHaveText("Section changed");
    await expect(catalog.getByTestId("element-change")).toHaveAttribute("data-status", "modified");
    await expect(catalog.getByTestId("segment-heading-change")).toHaveCount(0);
    const row = catalog.getByTestId("attribute-change");
    await expect(row.locator("th")).toHaveText("technology");
    await expect(row.locator("td").nth(0)).toHaveText("Node.js / Express");
    await expect(row.locator("td").nth(1)).toHaveText("Go");

    await expect(catalog.getByTestId("segment-base")).toHaveCount(0);
    await catalog.getByTestId("toggle-base").click();
    await expect(catalog.getByTestId("toggle-base")).toHaveAttribute("aria-expanded", "true");
    await expect(catalog.getByTestId("segment-base")).toBeVisible();
  });

  test("renders added, removed and modified prose from the matching snapshot", async ({ page }) => {
    await page.goto(`/#${GLOSSARY_FILE}`);
    await expect(segment(page, "added: Idempotency Key").getByTestId("segment-head")).toContainText(
      "A client-chosen key that makes retried order submissions safe.",
    );
    const glossary = segment(page, "modified: Glossary");
    // A literal "</script>" in the prose is rendered as text.
    await expect(glossary.getByTestId("segment-head")).toContainText("</script>");
    // Only the appended sentence is marked; the unchanged prose around it stays plain.
    const head = glossary.getByTestId("segment-head");
    await expect(head.locator("ins").first()).toContainText("Terms are plain words, never");
    const inserted = (await head.locator("ins").allTextContents()).join("");
    expect(inserted).not.toContain("These definitions ensure");
    await expect(head.locator("del")).toHaveCount(0);
    await glossary.getByTestId("toggle-base").click();
    await expect(glossary.getByTestId("segment-base")).not.toContainText("</script>");

    await page.goto(`/#${BB}`);
    await expect(
      segment(page, "removed: SMS Delivery Contract").getByTestId("segment-base"),
    ).toContainText(
      "The Notification Service provides the contract for transactional SMS delivery.",
    );
  });

  test("marks changed chapters and headings in the sidebar", async ({ page }) => {
    await page.goto("/#changes");
    const building = page.getByTestId("sidebar-doc-link").filter({ hasText: "5. Building Blocks" });
    await expect(building.getByTestId("doc-change-badge")).toHaveText("~1−1");
    const intro = page.getByTestId("sidebar-doc-link").filter({ hasText: "1. Introduction" });
    await expect(intro.getByTestId("doc-change-badge")).toHaveCount(0);

    await building.click();
    await expect(page.getByTestId("changes-view")).toHaveCount(0);
    const changed = page.getByTestId("sidebar-heading-link").filter({
      has: page.getByTestId("heading-change"),
    });
    await expect(changed).toHaveText(["Catalog Service"]);
    await expect(changed.getByTestId("heading-change")).toHaveAttribute("data-status", "modified");

    await page.getByTestId("sidebar-changes-link").click();
    await expect(page.getByTestId("changes-view")).toBeVisible();
  });

  test("shows unchanged chapters as usual", async ({ page }) => {
    await page.goto("/#01-introduction.arc42.md");
    await expect(page.locator("article h1")).toBeVisible();
    await expect(page.getByTestId("chapter-diff")).toHaveCount(0);
    await expect(page.getByTestId("diff-segment")).toHaveCount(0);
  });
});

test.describe("Changes view — renamed sections", () => {
  test("shows a section whose heading was renamed once, as changed", async ({ page }) => {
    const root = createDiffRepository();
    const file = join(root, BB);
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace("## Catalog Service\n", () => "## Catalog\n"),
    );
    const server = await startDiffServer(root, 3399);
    try {
      await page.goto(`${server.url}/#${BB}`);
      const catalog = segment(page, "modified: Catalog");
      await expect(catalog.getByTestId("segment-status")).toContainText("Section changed");
      await expect(catalog.getByTestId("segment-heading-change")).toHaveText(
        /heading\s*Catalog Service\s*→?\s*(renamed to)?\s*Catalog$/,
      );
      await expect(segment(page, "removed: Catalog Service")).toHaveCount(0);
      await expect(segment(page, "added: Catalog")).toHaveCount(0);
      // The previous version carries the old heading.
      await catalog.getByTestId("toggle-base").click();
      await expect(catalog.getByTestId("segment-base").locator("h2")).toHaveText("Catalog Service");
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe("Changes view — value changes", () => {
  test("marks only the changed part of a value", async ({ page }) => {
    const root = createDiffRepository();
    const file = join(root, BB);
    writeFileSync(
      file,
      readFileSync(file, "utf8")
        .replace("requires: if-catalog-db, if-catalog-cache\n", () => "requires: if-catalog-db\n")
        .replace(
          'bb-order-service["Order Service\\n(Node.js / Express)"]',
          () => 'bb-order-service["Order Service\\n(Kotlin)"]',
        ),
    );
    const server = await startDiffServer(root, 3400);
    try {
      await page.goto(`${server.url}/#${BB}`);
      const catalog = segment(page, "modified: Catalog Service");
      const requires = catalog.getByTestId("attribute-change").filter({ hasText: "requires" });
      // Kept list items stay plain; only the removed item is marked.
      await expect(requires.locator("td").nth(0)).toHaveText("if-catalog-db, if-catalog-cache");
      await expect(requires.getByTestId("value-removed")).toHaveText(", if-catalog-cache");
      await expect(requires.locator("td").nth(1)).toHaveText("if-catalog-db");
      await expect(requires.getByTestId("value-added")).toHaveCount(0);

      // Words: "Node.js / Express" → "Go" replaces every token.
      const technology = catalog.getByTestId("attribute-change").filter({ hasText: "technology" });
      await expect(technology.getByTestId("value-added")).toHaveText(["Go"]);

      // A diagram source is a line diff: one line out, one in, the rest collapsed.
      const source = segment(page, "modified: Building Blocks")
        .getByTestId("attribute-change")
        .filter({ hasText: "source" });
      await expect(source.getByTestId("line-removed")).toHaveText([/\(Node\.js \/ Express\)/]);
      await expect(source.getByTestId("line-added")).toHaveText([/\(Kotlin\)/]);
      await expect(source.getByTestId("line-gap").first()).toContainText("unchanged lines");
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe("Changes view — live updates", () => {
  test("follows edits, reports an empty difference and surfaces errors", async ({ page }) => {
    const root = createDiffRepository();
    const server = await startDiffServer(root, 3392);
    try {
      await page.goto(`${server.url}/`);
      await expect(page.getByTestId("diff-index-item")).toHaveCount(4);

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
  test("renders the difference frozen into build --diff", async ({ page, diffRepository }) => {
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-diff-site-"));
    runCli("--dir", diffRepository, "build", "--out", out, "--diff");
    const site = await serveStatic(out, 3393);
    try {
      await page.goto(`${site.url}/`);
      await expect(page.getByTestId("changes-view")).toBeVisible();
      await expect(page.getByTestId("diff-index-item")).toHaveCount(4);
      await page.getByTestId("diff-index-document-link").nth(1).click();
      await expect(segment(page, "added: Idempotency Key")).toBeVisible();
      // Without --with-history there is no history to switch to.
      await expect(page.getByTestId("sidebar-tab-history")).toHaveCount(0);
    } finally {
      await site.stop();
      rmSync(out, { recursive: true, force: true });
    }
  });
});
