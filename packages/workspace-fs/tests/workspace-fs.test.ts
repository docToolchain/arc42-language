import { describe, expect, test } from "vite-plus/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  discoverFiles,
  loadWorkspace,
  pathEvidence,
  readWorkspaceDocuments,
} from "../src/index.ts";

describe("filesystem workspace adapter", () => {
  test("discovers recursively and preserves sorted document order", async () => {
    const root = await mkdtemp(join(tmpdir(), "arc42-workspace-fs-"));
    try {
      await mkdir(join(root, "nested"));
      await writeFile(join(root, "z.arc42.md"), "# Z\n");
      await writeFile(join(root, "nested", "a.arc42.md"), "# A\n");
      expect(await discoverFiles(root)).toEqual([
        join(root, "nested", "a.arc42.md"),
        join(root, "z.arc42.md"),
      ]);
      expect((await readWorkspaceDocuments(root)).map((doc) => doc.filePath)).toEqual(
        await discoverFiles(root),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("supplies path evidence and resolves interface relationships in the payload", async () => {
    const root = await mkdtemp(join(tmpdir(), "arc42-workspace-fs-"));
    try {
      await writeFile(
        join(root, "architecture.arc42.md"),
        "# Architecture\n\n:::building-block\nid: provider\ntitle: Provider\npath: src\n:::\n\n:::building-block\nid: consumer\ntitle: Consumer\nrequires: if-service\n:::\n\n:::interface\nid: if-service\ntitle: Service\nprovider: provider\n:::\n",
      );
      await mkdir(join(root, "src"));
      const evidence = await pathEvidence(root);
      expect(evidence.knownPaths).toContain("src");
      expect(evidence.root).toBe(root);
      const payload = await loadWorkspace(root);
      expect(payload.elements.map((element) => element.id)).toEqual([
        "consumer",
        "provider",
        "if-service",
      ]);
      expect(payload.edges).toEqual(
        expect.arrayContaining([
          { from: "provider", to: "if-service", relation: "provides" },
          { from: "consumer", to: "if-service", relation: "requires" },
        ]),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
