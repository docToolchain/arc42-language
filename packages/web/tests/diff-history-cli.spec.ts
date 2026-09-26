import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BB,
  cliPath,
  createHistoryRepository,
  expect,
  runCli,
  startServer,
  test,
} from "./diff-fixtures.ts";

// Black-box tests of the architecture history in `arc42 serve` and `arc42 build --with-history`.

interface Pearl {
  commit: string | null;
  subject: string;
  chunk: number;
}
interface Entry {
  commit: string | null;
  semantic: boolean;
  messageHtml: string;
  added: number;
  modified: number;
  removed: number;
  diff?: { view: { documents: unknown[] } };
  error?: string;
}

interface Tree {
  files: Record<string, string>;
  paths: string[] | { sameAs: string };
}

function git(root: string, ...args: string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

/**
 * Commit a code file. Alone it is not an architecture commit; with the pending
 * architecture change it becomes the newest pearl, adding a path to its tree.
 */
function commitCode(root: string, withArchitecture = false): string {
  writeFileSync(join(root, "secret.ts"), "export const secret = 42;\n");
  git(root, "add", withArchitecture ? "-A" : "secret.ts");
  git(root, "commit", "-qm", withArchitecture ? "feat: order service in Kotlin" : "chore: code");
  return git(root, "rev-parse", "HEAD:secret.ts").trim();
}

function parseJsonLines<T>(text: string): T[] {
  expect(text.endsWith("\n")).toBe(true);
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

const SUBJECTS = [
  "Uncommitted changes",
  "style: reflow the glossary intro",
  "feat: switch the catalog to Go",
  "initial architecture",
];

function expectHistory(pearls: Pearl[], entries: Entry[]) {
  expect(pearls.map((pearl) => pearl.subject)).toEqual(SUBJECTS);
  expect(pearls.every((pearl) => pearl.chunk === 0)).toBe(true);
  expect(entries.map((entry) => entry.commit)).toEqual(pearls.map((pearl) => pearl.commit));
  const [working, reflow, feature, initial] = entries;
  expect(working).toMatchObject({ commit: null, semantic: true, modified: 1 });
  expect(reflow).toMatchObject({ semantic: false, added: 0, modified: 0, removed: 0 });
  expect(feature).toMatchObject({ semantic: true, added: 1, modified: 2, removed: 1 });
  expect(feature!.messageHtml).toContain("<strong>p95 search latency</strong>");
  expect(initial!.semantic).toBe(true);
  expect(entries.every((entry) => entry.error === undefined)).toBe(true);
}

test.describe("arc42 serve — history API", () => {
  test("serves the pearl index and lazily computed chunks as JSONL", async () => {
    const root = createHistoryRepository();
    const server = await startServer(root, 3394);
    try {
      const index = await fetch(`${server.url}/api/history/index.jsonl`);
      expect(index.status).toBe(200);
      expect(index.headers.get("content-type")).toContain("application/x-ndjson");
      const pearls = parseJsonLines<Pearl>(await index.text());

      const chunk = await fetch(`${server.url}/api/history/chunk-0.jsonl`);
      expect(chunk.status).toBe(200);
      expectHistory(pearls, parseJsonLines<Entry>(await chunk.text()));

      expect((await fetch(`${server.url}/api/history/chunk-7.jsonl`)).status).toBe(404);
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("serves a commit's tree and its architecture files, read from git", async () => {
    const root = createHistoryRepository();
    const codeBlob = commitCode(root);
    const server = await startServer(root, 3397);
    try {
      const pearls = parseJsonLines<Pearl>(
        await (await fetch(`${server.url}/api/history/index.jsonl`)).text(),
      );
      const feature = pearls.find((pearl) => pearl.subject === SUBJECTS[2])!.commit!;
      const initial = pearls.find((pearl) => pearl.subject === SUBJECTS[3])!.commit!;

      const response = await fetch(`${server.url}/api/history/tree/${feature}.json`);
      expect(response.status).toBe(200);
      const tree = (await response.json()) as Tree;
      expect(tree.files[BB]).toBe(git(root, "rev-parse", `${feature}:${BB}`).trim());
      expect(tree.paths).toContain(BB);

      const blob = await fetch(`${server.url}/api/history/blob/${tree.files[BB]}`);
      expect(blob.status).toBe(200);
      expect(await blob.text()).toBe(git(root, "show", `${feature}:${BB}`));

      // An older version of the same file is served too; code never is.
      const oldBlob = git(root, "rev-parse", `${initial}:${BB}`).trim();
      expect((await fetch(`${server.url}/api/history/blob/${oldBlob}`)).status).toBe(200);
      const code = await fetch(`${server.url}/api/history/blob/${codeBlob}`);
      expect(code.status).toBe(404);
      expect(((await code.json()) as { error: string }).error).toContain(
        "Not an architecture file of this history",
      );
      const unknown = await fetch(`${server.url}/api/history/tree/${"0".repeat(40)}.json`);
      expect(unknown.status).toBe(404);
      expect((await fetch(`${server.url}/api/history/tree/HEAD.json`)).status).toBe(404);
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("follows new commits and uncommitted changes", async () => {
    const root = createHistoryRepository();
    const server = await startServer(root, 3395);
    try {
      spawnSync("git", ["-C", root, "commit", "-qam", "feat: order service in Kotlin"]);
      const subjects = async () =>
        parseJsonLines<Pearl>(
          await (await fetch(`${server.url}/api/history/index.jsonl`)).text(),
        ).map((pearl) => pearl.subject);
      expect(await subjects()).toEqual(["feat: order service in Kotlin", ...SUBJECTS.slice(1)]);
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("explains why there is no history outside a Git repository", async () => {
    const dir = mkdtempSync(join(tmpdir(), "arc42-e2e-history-not-git-"));
    writeFileSync(join(dir, "01-introduction.arc42.md"), "# Introduction and Goals\n\nHello.\n");
    const server = await startServer(dir, 3396);
    try {
      const response = await fetch(`${server.url}/api/history/index.jsonl`);
      expect(response.status).toBe(422);
      expect(((await response.json()) as { error: string }).error).toContain("Git command failed");
    } finally {
      await server.stop();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe("arc42 build --with-history", () => {
  test("writes the pearl index and chunks and announces them to the page", () => {
    const root = createHistoryRepository();
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-history-site-"));
    try {
      runCli("--dir", root, "build", "--out", out, "--with-history");
      expect(readdirSync(join(out, "history")).sort()).toEqual([
        "blob",
        "chunk-0.jsonl",
        "index.jsonl",
        "tree",
      ]);
      expectHistory(
        parseJsonLines<Pearl>(readFileSync(join(out, "history", "index.jsonl"), "utf8")),
        parseJsonLines<Entry>(readFileSync(join(out, "history", "chunk-0.jsonl"), "utf8")),
      );
      expect(readFileSync(join(out, "index.html"), "utf8")).toContain(
        '<script>window.__HISTORY__={"base":"history/"};</script>',
      );
    } finally {
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("writes a tree per commit, sharing unchanged path lists, and each architecture file once", () => {
    const root = createHistoryRepository();
    const codeBlob = commitCode(root, true);
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-history-snapshots-"));
    try {
      runCli("--dir", root, "build", "--out", out, "--with-history");
      const history = join(out, "history");
      const commits = parseJsonLines<Pearl>(readFileSync(join(history, "index.jsonl"), "utf8"))
        .map((pearl) => pearl.commit)
        .filter((commit): commit is string => commit !== null);
      expect(readdirSync(join(history, "tree")).sort()).toEqual(
        commits.map((commit) => `${commit}.json`).sort(),
      );
      const trees = new Map(
        commits.map((commit) => [
          commit,
          JSON.parse(readFileSync(join(history, "tree", `${commit}.json`), "utf8")) as Tree,
        ]),
      );

      // The newest commit adds secret.ts, so its path list differs; the older ones share one.
      const [newest, ...older] = commits;
      expect(trees.get(newest!)!.paths).toContain("secret.ts");
      const owner = older.find((commit) => Array.isArray(trees.get(commit)!.paths))!;
      for (const commit of older) {
        const paths = trees.get(commit)!.paths;
        if (commit !== owner) expect(paths).toEqual({ sameAs: owner });
      }
      expect(trees.get(owner)!.paths).not.toContain("secret.ts");

      // Each architecture file version once, with git's content; no code.
      const ids = new Set([...trees.values()].flatMap((tree) => Object.values(tree.files)));
      expect(readdirSync(join(history, "blob")).sort()).toEqual([...ids].sort());
      expect(ids.has(codeBlob)).toBe(false);
      for (const commit of commits) {
        const id = trees.get(commit)!.files[BB]!;
        expect(readFileSync(join(history, "blob", id), "utf8")).toBe(
          git(root, "show", `${commit}:${BB}`),
        );
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("writes no history without --with-history", () => {
    const root = createHistoryRepository();
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-no-history-site-"));
    try {
      runCli("--dir", root, "build", "--out", out);
      expect(readdirSync(out)).not.toContain("history");
      expect(readFileSync(join(out, "index.html"), "utf8")).not.toContain("__HISTORY__");
    } finally {
      rmSync(out, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails outside a Git repository without writing a site", () => {
    const dir = mkdtempSync(join(tmpdir(), "arc42-e2e-history-build-not-git-"));
    const out = join(dir, "site");
    try {
      writeFileSync(join(dir, "01-introduction.arc42.md"), "# Introduction and Goals\n\nHello.\n");
      const result = spawnSync(
        "node",
        [cliPath, "--dir", dir, "build", "--out", out, "--with-history"],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("arc42 build --with-history");
      expect(readdirSync(dir)).toEqual(["01-introduction.arc42.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
