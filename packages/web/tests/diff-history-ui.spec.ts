import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BB,
  createHistoryRepository,
  expect,
  runCli,
  serveStatic,
  startServer,
  test,
  type Page,
} from "./diff-fixtures.ts";

// Black-box UI tests of the architecture history (pearl chain) in serve and build.

const SUBJECTS = [
  "Uncommitted changes",
  "style: reflow the glossary intro",
  "feat: switch the catalog to Go",
  "initial architecture",
];

function pearl(page: Page, subject: string) {
  return page.getByTestId("history-pearl").filter({ hasText: subject });
}

async function expectPearlChain(page: Page) {
  const pearls = page.getByTestId("history-pearl");
  await expect(pearls).toHaveCount(4);
  for (const [index, subject] of SUBJECTS.entries()) {
    await expect(pearls.nth(index)).toContainText(subject);
  }
  await expect(pearl(page, SUBJECTS[0]!)).toHaveAttribute("data-state", "semantic");
  await expect(pearl(page, SUBJECTS[1]!)).toHaveAttribute("data-state", "empty");
  await expect(pearl(page, SUBJECTS[1]!)).toContainText("no model change");
  await expect(pearl(page, SUBJECTS[2]!)).toHaveAttribute("data-state", "semantic");
  await expect(pearl(page, SUBJECTS[3]!)).toHaveAttribute("data-state", "semantic");
}

/**
 * Browse the root commit from the history: chapter 5 still has the SMS Delivery
 * Contract, which the next commit removed. Navigation stays in that version.
 */
async function expectBrowsedRootVersion(page: Page) {
  await pearl(page, SUBJECTS[3]!).getByTestId("pearl-select").click();
  await page.getByTestId("browse-version").click();
  await expect(page).toHaveURL(/\?version=[0-9a-f]{40}$/);
  const banner = page.getByTestId("version-banner");
  await expect(banner).toContainText(SUBJECTS[3]!);
  await page.getByTestId("sidebar-doc-link").filter({ hasText: "5. Building Blocks" }).click();
  await expect(page).toHaveURL(/\?version=[0-9a-f]{40}#05-building-blocks\.arc42\.md$/);
  await expect(page.getByRole("heading", { name: "SMS Delivery Contract" })).toBeVisible();
  await expect(banner).toBeVisible();
}

/** Leave the version: the current documentation no longer has the section. */
async function expectCurrentVersion(page: Page) {
  await expect(page.getByTestId("version-banner")).toHaveCount(0);
  await page.getByTestId("sidebar-doc-link").filter({ hasText: "5. Building Blocks" }).click();
  await expect(page.getByRole("heading", { name: "Order Service", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SMS Delivery Contract" })).toHaveCount(0);
}

async function expectFeatureCommit(page: Page) {
  await pearl(page, SUBJECTS[2]!).getByTestId("pearl-select").click();
  await expect(page).toHaveURL(/#history:[0-9a-f]{40}$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(SUBJECTS[2]!);
  // The commit message is collapsed; the toggle above the change expands it.
  const toggle = page.getByTestId("commit-message-toggle");
  await expect(page.getByTestId("commit-message")).toHaveCount(0);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page).toHaveURL(/#history:[0-9a-f]{40}:message$/);
  await expect(page.getByTestId("commit-message").locator("strong")).toHaveText(
    "p95 search latency",
  );
  await toggle.click();
  await expect(page.getByTestId("commit-message")).toHaveCount(0);
  await expect(page.getByTestId("diff-finding")).toContainText([
    "Block 'bb-catalog-service' changed without changing its section prose.",
  ]);
  await expect(page.getByTestId("diff-segment")).toHaveCount(4);
  // Without the full documents, unchanged sections are headings with a skeleton.
  await expect(page.getByTestId("chapter-diff")).toHaveCount(2);
  expect(await page.getByTestId("section-skeleton").count()).toBeGreaterThan(0);
  // Summary links lead to the element within the entry.
  await page
    .getByTestId("diff-index-item")
    .filter({ hasText: "bb-catalog-service" })
    .getByRole("link")
    .click();
  await expect(page.locator("#el-bb-catalog-service")).toBeVisible();
  await expect(page).toHaveURL(/#history:[0-9a-f]{40}$/);
}

test.describe("History in arc42 serve", () => {
  let root: string;
  let server: { url: string; stop: () => Promise<void> };

  // A fresh server per test: some tests commit to the repository.
  let port = 3410;
  test.beforeEach(async () => {
    root = createHistoryRepository();
    server = await startServer(root, port++);
  });

  test.afterEach(async () => {
    await server.stop();
    rmSync(root, { recursive: true, force: true });
  });

  test("switches the sidebar to the pearl chain and opens the newest pearl", async ({ page }) => {
    await page.goto(`${server.url}/`);
    await expect(page.getByTestId("sidebar-tab-documents")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByTestId("sidebar-tab-history").click();

    await expectPearlChain(page);
    await expect(page).toHaveURL(/#history:worktree$/);
    await expect(pearl(page, SUBJECTS[0]!).getByTestId("pearl-select")).toHaveAttribute(
      "aria-current",
      "true",
    );
    const row = page.getByTestId("attribute-change");
    await expect(row.locator("td").nth(0)).toHaveText("Node.js / Express");
    await expect(row.locator("td").nth(1)).toHaveText("Kotlin");
  });

  test("shows a commit's rendered message and its change", async ({ page }) => {
    await page.goto(`${server.url}/#history`);
    await expectFeatureCommit(page);
  });

  test("says when a commit did not change the model", async ({ page }) => {
    await page.goto(`${server.url}/#history`);
    await pearl(page, SUBJECTS[1]!).getByTestId("pearl-select").click();
    await expect(page.getByTestId("changes-empty")).toHaveText("No architecture changes.");
    // A commit without a message body offers no message to expand.
    await expect(page.getByTestId("commit-message-toggle")).toHaveCount(0);
  });

  test("returns to the documents", async ({ page }) => {
    await page.goto(`${server.url}/#history`);
    await expect(page.getByTestId("history-pearl")).toHaveCount(4);
    await page.getByTestId("sidebar-tab-documents").click();
    await expect(page.getByTestId("sidebar-doc-link").first()).toBeVisible();
    await expect(page.getByTestId("history-chain")).toHaveCount(0);
    await expect(page.locator("article h1")).toBeVisible();
  });

  test("adds a pearl when a commit is made", async ({ page }) => {
    await page.goto(`${server.url}/#history`);
    await expect(page.getByTestId("history-pearl")).toHaveCount(4);
    spawnSync("git", ["-C", root, "commit", "-qam", "feat: order service in Kotlin"]);
    await expect(page.getByTestId("history-pearl").first()).toContainText(
      "feat: order service in Kotlin",
      { timeout: 10000 },
    );
    await expect(page.getByTestId("history-pearl")).toHaveCount(4);
  });

  test("browses an earlier version as a whole and returns to the current one", async ({ page }) => {
    await page.goto(`${server.url}/#history`);
    await expectBrowsedRootVersion(page);
    await page.getByTestId("version-leave").click();
    await expect(page).not.toHaveURL(/version=/);
    await expect(page.getByTestId("version-banner")).toHaveCount(0);

    // The browser's back button returns to the version; the history tab leaves it
    // for the current version, at the pearl of that version.
    await page.goBack();
    await expect(page.getByTestId("version-banner")).toBeVisible();
    await page.getByTestId("sidebar-tab-history").click();
    await expect(page).toHaveURL(/\/#history:[0-9a-f]{40}$/);
    await expect(page.getByTestId("version-banner")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(SUBJECTS[3]!);
    await page.getByTestId("sidebar-tab-documents").click();
    await expectCurrentVersion(page);
  });

  test("offers no version to browse for uncommitted changes", async ({ page }) => {
    await page.goto(`${server.url}/#history`);
    await expect(page.getByTestId("history-entry-meta")).toContainText("working tree");
    await expect(page.getByTestId("browse-version")).toHaveCount(0);
  });

  test("marks a commit that cannot be diffed", async ({ page }) => {
    const glossary = join(root, "12-glossary.arc42.md");
    writeFileSync(
      glossary,
      `${readFileSync(glossary, "utf8")}\n## Copy\n\nA copy.\n\n\`\`\`arc42\n:::glossary-term\nid: term-jwt\ntitle: Copy\ndefinition: Duplicate.\n:::\n\`\`\`\n`,
    );
    spawnSync("git", ["-C", root, "commit", "-qam", "broken: duplicate id"]);

    await page.goto(`${server.url}/#history`);
    const broken = pearl(page, "broken: duplicate id");
    await expect(broken).toHaveAttribute("data-state", "error");
    await broken.getByTestId("pearl-select").click();
    await expect(page.getByTestId("diff-error")).toContainText("Duplicate id 'term-jwt'");
    // The rest of the history is unaffected.
    await expect(pearl(page, SUBJECTS[2]!)).toHaveAttribute("data-state", "semantic");
  });
});

test.describe("History outside a Git repository", () => {
  test("explains why there is no history", async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), "arc42-e2e-history-ui-not-git-"));
    writeFileSync(join(dir, "01-introduction.arc42.md"), "# Introduction and Goals\n\nHello.\n");
    const server = await startServer(dir, 3398);
    try {
      await page.goto(`${server.url}/#history`);
      await expect(page.getByTestId("history-unavailable")).toContainText("No history available.");
      await expect(page.getByTestId("history-unavailable")).toContainText("Git command failed");
    } finally {
      await server.stop();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe("History in a static build", () => {
  test("loads the pearl chain from build --with-history", async ({ page }) => {
    const root = createHistoryRepository();
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-history-ui-site-"));
    runCli("--dir", root, "build", "--out", out, "--with-history");
    const site = await serveStatic(out, 3397);
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    try {
      await page.goto(`${site.url}/#history`);
      await expectPearlChain(page);
      await expectFeatureCommit(page);
      expect(requested).toContain("/history/index.jsonl");
      expect(requested).toContain("/history/chunk-0.jsonl");
      // The documents still work next to the history.
      await page.getByTestId("sidebar-tab-documents").click();
      await page.getByTestId("sidebar-doc-link").filter({ hasText: "5. Building Blocks" }).click();
      await expect(page).toHaveURL(new RegExp(`#${BB.replaceAll(".", "\\.")}$`));
    } finally {
      await site.stop();
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("browses an earlier version from the files next to the page", async ({ page }) => {
    const root = createHistoryRepository();
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-history-ui-browse-"));
    runCli("--dir", root, "build", "--out", out, "--with-history");
    const site = await serveStatic(out, 3399);
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    try {
      await page.goto(`${site.url}/#history`);
      await expectBrowsedRootVersion(page);
      expect(requested.some((path) => /^\/history\/tree\/[0-9a-f]{40}\.json$/.test(path))).toBe(
        true,
      );
      expect(requested.some((path) => /^\/history\/blob\/[0-9a-f]{40}$/.test(path))).toBe(true);
      await page.getByTestId("version-leave").click();
      await expectCurrentVersion(page);
    } finally {
      await site.stop();
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("browses an earlier version from a single file", async ({ page }) => {
    const root = createHistoryRepository();
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-history-ui-browse-single-"));
    runCli("--dir", root, "build", "--out", out, "--with-history", "--single-file");
    try {
      await page.goto(`file://${join(out, "index.html")}#history`);
      await expectBrowsedRootVersion(page);
    } finally {
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("shows why a version cannot be loaded", async ({ page }) => {
    const root = createHistoryRepository();
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-history-ui-broken-"));
    runCli("--dir", root, "build", "--out", out, "--with-history");
    for (const blob of readdirSync(join(out, "history", "blob"))) {
      rmSync(join(out, "history", "blob", blob));
    }
    const site = await serveStatic(out, 3400);
    try {
      await page.goto(`${site.url}/#history`);
      await pearl(page, SUBJECTS[3]!).getByTestId("pearl-select").click();
      await page.getByTestId("browse-version").click();
      const error = page.getByTestId("version-error");
      await expect(error).toContainText("Failed to load version");
      await expect(error).toContainText(/history\/blob\/[0-9a-f]{40} returned 404/);
      await expect(page.locator("article")).toHaveCount(0);
    } finally {
      await site.stop();
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe("History of an AsciiDoc workspace", () => {
  test("renders an earlier version's prose with the AsciiDoc notation, loaded on demand", async ({
    page,
  }) => {
    const kanban = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../examples/kanban-board",
    );
    const root = mkdtempSync(join(tmpdir(), "arc42-e2e-history-adoc-"));
    const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args]);
    cpSync(kanban, root, { recursive: true });
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "arc42 e2e");
    git("add", ".");
    git("commit", "-qm", "initial architecture");
    const file = join(root, "05-building-blocks.arc42.adoc");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(
        "The Frontend is a single-page application",
        "The Frontend is a *progressive* single-page application",
      ),
    );
    git("commit", "-qam", "docs: the frontend is progressive");
    const server = await startServer(root, 3401);
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    try {
      await page.goto(`${server.url}/#${"05-building-blocks.arc42.adoc"}`);
      await expect(page.locator("article strong", { hasText: "progressive" })).toBeVisible();
      const before = scripts.length;

      await page.goto(`${server.url}/#history`);
      await page
        .getByTestId("history-pearl")
        .filter({ hasText: "initial architecture" })
        .getByTestId("pearl-select")
        .click();
      await page.getByTestId("browse-version").click();
      await page.getByTestId("sidebar-doc-link").filter({ hasText: "5. Building Blocks" }).click();
      const frontend = page.locator("article p", { hasText: "The Frontend is a single-page" });
      await expect(frontend).toBeVisible();
      await expect(page.locator("article strong", { hasText: "progressive" })).toHaveCount(0);
      // Rendering AsciiDoc in the browser loaded more code than the page itself.
      expect(scripts.length).toBeGreaterThan(before);
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
