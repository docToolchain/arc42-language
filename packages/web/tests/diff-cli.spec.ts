import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BB,
  GLOSSARY,
  cliPath,
  createDiffRepository,
  expect,
  runCli,
  startDiffServer,
  test,
} from "./diff-fixtures.ts";

// Black-box tests of `arc42 serve --diff` and `arc42 build --diff` (built CLI).

interface Segment {
  status: string;
  section: { headingPath: string[] };
  elements: Array<{ id: string; status: string }>;
}
interface Payload {
  base: { label: string; commit: string };
  head: { label: string };
  findings: Array<{ kind: string; elementId?: string }>;
  view: { documents: Array<{ file: string; segments: Segment[] }> };
}

function segmentsOf(payload: Payload, file: string): Array<[string | undefined, string]> {
  const document = payload.view.documents.find((candidate) => candidate.file === file);
  return (document?.segments ?? []).map((segment) => [
    segment.section.headingPath.at(-1),
    segment.status,
  ]);
}

test.describe("arc42 serve --diff", () => {
  test("serves the difference between the index and the working tree", async ({ request }) => {
    const response = await request.get("/api/diff");
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as Payload;

    expect(payload.base.label).toBe("index");
    expect(payload.head.label).toBe("working tree");
    expect(payload.findings).toContainEqual(
      expect.objectContaining({
        kind: "block-without-prose-change",
        elementId: "bb-catalog-service",
      }),
    );
    expect(payload.view.documents.map((document) => document.file)).toEqual([BB, GLOSSARY]);
    expect(segmentsOf(payload, BB)).toEqual([
      ["Catalog Service", "modified"],
      ["SMS Delivery Contract", "removed"],
    ]);
    expect(segmentsOf(payload, GLOSSARY)).toEqual([
      ["Glossary", "modified"],
      ["Idempotency Key", "added"],
    ]);
  });

  test("serves the head snapshot as the workspace", async ({ request }) => {
    const workspace = (await (await request.get("/api/workspace")).json()) as {
      elements: Array<{ id: string }>;
    };
    const ids = workspace.elements.map((element) => element.id);
    expect(ids).toContain("term-idempotency-key");
    expect(ids).not.toContain("if-notify-sms");
  });

  test("follows the working tree and the index", async () => {
    const root = createDiffRepository();
    const server = await startDiffServer(root, 3390);
    try {
      const findings = async () =>
        ((await (await fetch(`${server.url}/api/diff`)).json()) as Payload).findings.map(
          (finding) => finding.elementId,
        );
      expect(await findings()).toContain("bb-catalog-service");

      // Staging everything makes the index equal to the working tree.
      spawnSync("git", ["-C", root, "add", "-A"]);
      await expect
        .poll(
          async () => (await fetch(`${server.url}/api/diff`).then((r) => r.json())).view.documents,
          {
            timeout: 10000,
          },
        )
        .toEqual([]);
    } finally {
      await server.stop();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails outside a Git repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "arc42-e2e-not-git-"));
    try {
      writeFileSync(join(dir, "01-introduction.arc42.md"), "# Introduction and Goals\n\nHello.\n");
      const result = spawnSync(
        "node",
        [cliPath, "--dir", dir, "serve", "--diff", "--port", "3391"],
        {
          encoding: "utf8",
          timeout: 15000,
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Git command failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe("arc42 build --diff", () => {
  test("injects the difference and escapes script terminators", ({ diffRepository }) => {
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-build-diff-"));
    try {
      runCli("--dir", diffRepository, "build", "--out", out, "--diff");
      const html = readFileSync(join(out, "index.html"), "utf8");
      const diffScript = /<script>window\.__DIFF__=(.*?);<\/script>/s.exec(html);
      expect(diffScript).not.toBeNull();
      const payload = JSON.parse(diffScript![1]!) as Payload;
      expect(payload.head.label).toBe("working tree");
      expect(segmentsOf(payload, BB)).toEqual([
        ["Catalog Service", "modified"],
        ["SMS Delivery Contract", "removed"],
      ]);
      // The glossary prose contains a literal "</script>"; it must stay inside the JSON.
      expect(JSON.stringify(payload)).toContain("</script>");
      expect(html).toContain("\\u003c/script>");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("rejects a reference without --diff", ({ diffRepository }) => {
    const out = mkdtempSync(join(tmpdir(), "arc42-e2e-build-usage-"));
    try {
      const result = spawnSync(
        "node",
        [cliPath, "--dir", diffRepository, "build", "--out", out, "HEAD"],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("require --diff");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
