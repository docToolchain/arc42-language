import { describe, expect, it } from "vite-plus/test";
import { parseMermaid } from "../src/index.ts";

describe("parseMermaid", () => {
  it("parses architecture-beta diagrams", async () => {
    const result = await parseMermaid({
      notation: "architecture",
      source: `architecture-beta
    service npm_packages(cloud)[npm-distributed toolchain packages]
    service documentation_workspace(disk)[Documentation Workspace]
    npm_packages:R -- L:documentation_workspace`,
    });

    expect(result).toEqual({
      ok: true,
      notation: "architecture",
      diagramType: "architecture",
    });
  }, 15_000);

  it("parses sequence and flowchart diagrams", async () => {
    await expect(
      parseMermaid({ notation: "sequence", source: "sequenceDiagram\n Alice->>Bob: hi" }),
    ).resolves.toMatchObject({ ok: true, notation: "sequence", diagramType: "sequence" });
    await expect(
      parseMermaid({ notation: "flowchart", source: "flowchart LR\n A-->B" }),
    ).resolves.toMatchObject({ ok: true, notation: "flowchart", diagramType: "flowchart-v2" });
  });

  it("parses flowchart labels and groups in Node", async () => {
    const result = await parseMermaid({
      notation: "flowchart",
      source: `graph TD
    actor-architect(["Architect"])
    subgraph system["System"]
      bb-cli["CLI"]
    end
    actor-architect -->|"uses"| bb-cli`,
    });

    expect(result).toMatchObject({ ok: true, notation: "flowchart", diagramType: "flowchart-v2" });
  });

  it("parses flowchart with unquoted pipe-label edge in Node (DOMPurify fallback)", async () => {
    // Regression test: Mermaid 11.17.2 calls DOMPurify for unquoted |label| edges
    // in Node environments. withoutBrowserText must strip them before the structural retry.
    const result = await parseMermaid({
      notation: "flowchart",
      source: `graph TD
  a["A"]
  b["B"]
  a -->|reads capability nodes| b`,
    });
    expect(result).toMatchObject({ ok: true, notation: "flowchart", diagramType: "flowchart-v2" });
  });

  it("parses flowchart with subgraph containing special chars and unquoted edge labels", async () => {
    // Regression test: the combination of a subgraph with a quoted title (en-dash),
    // multiple nodes, and unquoted pipe labels triggers a three-level DOMPurify fallback.
    // This is the exact pattern used in arc42 building-block diagrams.
    const result = await parseMermaid({
      notation: "flowchart",
      source: `graph TD
  subgraph sys["edugo \u2014 single deployable unit"]
    bb_cap["Capability Map"]
    bb_data["Data Layer"]
    bb_cicd["CI/CD Pipeline"]
  end
  bb_cap -->|reads capability nodes| bb_data
  bb_cicd -->|validates schema| bb_data`,
    });
    expect(result).toMatchObject({ ok: true, notation: "flowchart", diagramType: "flowchart-v2" });
  });

  it("normalizes malformed source into a failure result", async () => {
    const result = await parseMermaid({
      notation: "architecture",
      source: "architecture-beta\n service",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBeTruthy();
  });

  it("rejects a notation/header mismatch before invoking Mermaid", async () => {
    await expect(
      parseMermaid({ notation: "sequence", source: "flowchart LR\n A-->B" }),
    ).resolves.toEqual({
      ok: false,
      notation: "sequence",
      message: "Expected a sequence Mermaid diagram header.",
    });
  });
});
