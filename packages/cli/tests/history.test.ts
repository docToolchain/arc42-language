import { afterEach, describe, expect, test } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listArchitectureHistory } from "@arc42/workspace-fs";
import { chunkCommits, historyPearls, loadHistoryEntry } from "../src/history.ts";

const createdDirs: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function architecture(technology: string): string {
  return `# Building Block View\n\n## Service\n\nOwns orders.\n\n\`\`\`arc42\n:::building-block\nid: service\ntitle: Service\ntechnology: ${technology}\n:::\n\`\`\`\n`;
}

function repository(): string {
  const root = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "arc42-cli-history-"));
  createdDirs.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "arc42 test");
  writeFileSync(join(root, "05-building-blocks.arc42.md"), architecture("Node"));
  git(root, "add", ".");
  git(root, "commit", "-qm", "add service");
  writeFileSync(join(root, "05-building-blocks.arc42.md"), architecture("Go"));
  git(root, "add", ".");
  git(root, "commit", "-qm", "switch to go", "-m", "Because **performance** matters.");
  return root;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("history delivery", () => {
  test("renders the commit message of an entry and leaves out an empty one", async () => {
    const root = repository();
    const history = listArchitectureHistory(root);
    const pearls = historyPearls(history);
    const [latest, first] = chunkCommits(history, pearls, 0);

    const entry = await loadHistoryEntry(root, latest!);
    expect(entry).toMatchObject({ commit: pearls[0]!.commit, semantic: true, modified: 1 });
    expect(entry.messageHtml).toContain("<strong>performance</strong>");
    expect((await loadHistoryEntry(root, first!)).messageHtml).toBe("");
  });

  test("keeps commit messages out of the pearl index", () => {
    const pearls = historyPearls(listArchitectureHistory(repository()));
    expect(pearls.map((pearl) => pearl.subject)).toEqual(["switch to go", "add service"]);
    expect(pearls.every((pearl) => !("body" in pearl))).toBe(true);
  });
});
