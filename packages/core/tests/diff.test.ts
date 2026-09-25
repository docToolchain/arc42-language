import { describe, expect, test } from "vite-plus/test";
import { loadWorkspaceFromDocuments } from "../src/arc42.ts";
import { lintArchitectureDiff, type FileChange } from "../src/diff.ts";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import type { WorkspacePayload } from "../src/workspace.ts";

const FILE = "architecture.arc42.md";

function workspace(content?: string): WorkspacePayload {
  return loadWorkspaceFromDocuments(content === undefined ? [] : [parseMarkdown(FILE, content)]);
}

function block(type: string, attributes: Record<string, string>): string {
  const lines = Object.entries(attributes).map(([key, value]) => `${key}: ${value}`);
  return ["```arc42", `:::${type}`, ...lines, ":::", "```"].join("\n");
}

function section(heading: string, prose: string, blockText = ""): string {
  return `## ${heading}\n\n${prose}\n\n${blockText}\n`;
}

function architecture(...sections: string[]): string {
  return `# Architecture\n\n${sections.join("\n")}`;
}

function service(prose = "Narrative", title = "Service"): string {
  return section("Service", prose, block("building-block", { id: "service", title }));
}

function interfaces(...entries: Array<[id: string, path: string]>): string {
  return architecture(
    ...entries.map(([id, path]) =>
      section(
        id,
        `The ${id} interface.`,
        block("interface", { id, title: id, provider: "bb", path }),
      ),
    ),
  );
}

function buildingBlocks(...entries: Array<[id: string, path: string]>): string {
  return architecture(
    ...entries.map(([id, path]) =>
      section(id, `The ${id} block.`, block("building-block", { id, title: id, path })),
    ),
  );
}

const change = (
  filePath: string,
  newRanges: [number, number][],
  oldRanges = newRanges,
): FileChange => ({
  filePath,
  oldRanges: oldRanges.map(([start, end]) => ({ start, end })),
  newRanges: newRanges.map(([start, end]) => ({ start, end })),
});

describe("architecture diff lint", () => {
  test("reports a block-only change and ignores an unrelated section", () => {
    const result = lintArchitectureDiff({
      changes: [change(FILE, [[8, 8]])],
      base: workspace(architecture(service(), section("Other", "Narrative"))),
      head: workspace(
        architecture(service("Narrative", "Order Service"), section("Other", "Narrative")),
      ),
    });
    expect(result.consistencyFindings).toHaveLength(1);
    expect(result.consistencyFindings[0]?.kind).toBe("block-without-prose-change");
    expect(result.consistencyFindings[0]?.severity).toBe("warning");
  });

  test("accepts a prose and block change in the same section", () => {
    const result = lintArchitectureDiff({
      changes: [change(FILE, [[5, 8]])],
      base: workspace(architecture(service())),
      head: workspace(architecture(service("Updated narrative", "Order Service"))),
    });
    expect(result.consistencyFindings).toHaveLength(0);
  });

  test("reports prose-only changes", () => {
    const result = lintArchitectureDiff({
      changes: [change(FILE, [[5, 5]])],
      base: workspace(architecture(service())),
      head: workspace(architecture(service("Updated narrative"))),
    });
    expect(result.consistencyFindings[0]?.kind).toBe("prose-without-block-change");
  });

  test("accepts deletion of a block together with its prose", () => {
    const result = lintArchitectureDiff({
      changes: [change(FILE, [[0, -1]], [[1, 11]])],
      base: workspace(architecture(service())),
      head: workspace(),
    });
    expect(result.consistencyFindings).toHaveLength(0);
  });

  test("reports deletion of a block when its prose remains", () => {
    const result = lintArchitectureDiff({
      changes: [change(FILE, [[7, 6]], [[7, 11]])],
      base: workspace(architecture(service())),
      head: workspace(architecture(section("Service", "Narrative"))),
    });
    expect(result.consistencyFindings[0]?.kind).toBe("block-without-prose-change");
  });

  test("reports path impact as a non-blocking hint", () => {
    const docs = workspace(interfaces(["service-api", "src/service"]));
    const result = lintArchitectureDiff({
      changes: [change("src/service/index.ts", [[4, 4]])],
      base: docs,
      head: docs,
    });
    expect(result.pathFindings).toHaveLength(1);
    expect(result.pathFindings[0]?.severity).toBe("hint");
    expect(result.hasBlockingFindings).toBe(false);
  });

  test("architecture documents are not implementation paths", () => {
    const docs = workspace(interfaces(["workspace-access", "docs"]));
    const result = lintArchitectureDiff({
      changes: [
        change("docs/05-building-blocks.arc42.md", [[4, 4]]),
        change("docs/06-runtime-view.arc42.adoc", [[4, 4]]),
        change("docs/assets/overview.svg", [[1, 1]]),
      ],
      base: docs,
      head: docs,
    });
    expect(result.pathFindings.map((finding) => finding.file)).toEqual([
      "docs/assets/overview.svg",
    ]);
  });

  test("building-block path changes do not produce path hints", () => {
    const docs = workspace(buildingBlocks(["service", "src/service"]));
    const result = lintArchitectureDiff({
      changes: [change("src/service/index.ts", [[4, 4]])],
      base: docs,
      head: docs,
    });
    expect(result.pathFindings).toHaveLength(0);
  });

  test("uses path components rather than textual prefixes", () => {
    const docs = workspace(interfaces(["service-api", "src/service"]));
    const result = lintArchitectureDiff({
      changes: [change("src/services.ts", [[4, 4]])],
      base: docs,
      head: docs,
    });
    expect(result.pathFindings).toHaveLength(0);
  });

  test("uses Git tree paths to distinguish files, directories, and unresolved paths", () => {
    const docs = workspace(
      interfaces(["file", "src/Makefile"], ["dir", "src/foo.test"], ["missing", "src/missing"]),
    );
    const result = lintArchitectureDiff({
      changes: [
        change("src/Makefile", [[4, 4]]),
        change("src/foo.test/index.ts", [[5, 5]]),
        change("src/missing/file.ts", [[6, 6]]),
      ],
      base: docs,
      head: docs,
      headKnownPaths: new Set(["src/Makefile", "src/foo.test/index.ts"]),
    });
    expect(result.pathFindings.map((finding) => finding.elementId)).toEqual(["dir", "file"]);
  });

  test("keeps consistency findings independent from supplied path evidence", () => {
    const options = {
      changes: [change(FILE, [[5, 5]])],
      base: workspace(architecture(service())),
      head: workspace(architecture(service("Updated prose"))),
    };
    const withoutPaths = lintArchitectureDiff(options);
    const withPaths = lintArchitectureDiff({
      ...options,
      headKnownPaths: new Set(["src/service.ts"]),
    });
    expect(withPaths.consistencyFindings).toEqual(withoutPaths.consistencyFindings);
    expect(withPaths.pathFindings).toEqual(withoutPaths.pathFindings);
  });

  test("groups code changes by element, separating untouched from updated elements", () => {
    const base = workspace(
      interfaces(["api", "src/api"], ["events", "src/events"], ["jobs", "src/jobs"]),
    );
    const head = workspace(
      interfaces(["api", "src/api"], ["events", "src/events-v2"], ["jobs", "src/jobs"]),
    );
    const result = lintArchitectureDiff({
      changes: [
        change("src/api/index.ts", [[1, 1]]),
        change("src/api/routes.ts", [[1, 1]]),
        change("src/events/index.ts", [[1, 1]]),
      ],
      base,
      head,
    });
    expect(result.groups).toEqual({
      warnings: result.consistencyFindings,
      untouched: [{ elementId: "api", files: ["src/api/index.ts", "src/api/routes.ts"] }],
      updated: [{ elementId: "events", files: ["src/events/index.ts"] }],
      uncovered: [],
    });
    // Grouping never drops a finding.
    expect(result.pathFindings).toHaveLength(3);
  });

  describe("coverage findings (new-building-block-hint)", () => {
    const noChanges: FileChange[] = [];

    test("returns empty coverageFindings when the head has no elements", () => {
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(),
        head: workspace(),
        headKnownPaths: new Set(["src/foo.ts"]),
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("returns empty coverageFindings when no headKnownPaths provided", () => {
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(),
        head: workspace(buildingBlocks(["service", "src"])),
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("returns empty coverageFindings when headKnownPaths is empty", () => {
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(),
        head: workspace(buildingBlocks(["service", "src"])),
        headKnownPaths: new Set(),
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("reports new-building-block-hint for path uncovered in head but not in base", () => {
      // base: elements cover both src/app and src/lib
      // head: element only covers src/app → src/lib is newly uncovered
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(buildingBlocks(["app", "src/app"], ["lib", "src/lib"])),
        head: workspace(buildingBlocks(["app", "src/app"])),
        headKnownPaths: trackedPaths,
        baseKnownPaths: trackedPaths,
      });
      expect(result.coverageFindings).toHaveLength(1);
      expect(result.coverageFindings[0]?.kind).toBe("new-building-block-hint");
      expect(result.coverageFindings[0]?.severity).toBe("hint");
      expect(result.coverageFindings[0]?.file).toBe("src/lib");
      expect(result.coverageFindings[0]?.line).toBe(0);
      expect(result.coverageFindings[0]?.message).toContain("src/lib");
      expect(result.coverageFindings[0]?.message).toContain("building block");
    });

    test("does not report new-building-block-hint for path uncovered in both base and head", () => {
      // src/lib is uncovered in both snapshots — not newly uncovered
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const docs = workspace(buildingBlocks(["app", "src/app"]));
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: docs,
        head: docs,
        headKnownPaths: trackedPaths,
        baseKnownPaths: trackedPaths,
      });
      expect(result.coverageFindings).toHaveLength(0);
    });

    test("reports all uncovered paths as new-building-block-hints when the base has no elements", () => {
      // Empty base → any currently uncovered path is treated as newly uncovered
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(),
        head: workspace(buildingBlocks(["app", "src/app"])),
        headKnownPaths: trackedPaths,
      });
      expect(result.coverageFindings).toHaveLength(1);
      expect(result.coverageFindings[0]?.file).toBe("src/lib");
    });

    test("coverage findings are sorted alphabetically by file", () => {
      // One element establishes a domain (src/), the other two sub-dirs are uncovered
      const trackedPaths = new Set([
        "src/zebra/index.ts",
        "src/alpha/index.ts",
        "src/middle/index.ts",
      ]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(),
        head: workspace(buildingBlocks(["zebra", "src/zebra"])), // alpha and middle are uncovered
        headKnownPaths: trackedPaths,
      });
      const files = result.coverageFindings.map((f) => f.file);
      expect(files.length).toBeGreaterThan(0);
      expect(files).toEqual([...files].sort());
    });

    test("hasBlockingFindings is not affected by coverage findings", () => {
      // src/app is covered, src/lib is not — establishes a domain so uncovered paths appear
      const trackedPaths = new Set(["src/app/index.ts", "src/lib/index.ts"]);
      const result = lintArchitectureDiff({
        changes: noChanges,
        base: workspace(),
        head: workspace(buildingBlocks(["app", "src/app"])), // src/lib is newly uncovered
        headKnownPaths: trackedPaths,
      });
      expect(result.coverageFindings.length).toBeGreaterThan(0);
      expect(result.hasBlockingFindings).toBe(false);
    });
  });
});
