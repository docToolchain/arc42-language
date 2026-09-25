import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
});
