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
