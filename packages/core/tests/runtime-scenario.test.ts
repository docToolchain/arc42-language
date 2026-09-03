import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";
import type { Workspace } from "../src/model/types.ts";

function workspace(content: string): Workspace {
  return buildWorkspace([parseMarkdown("runtime.arc42.md", content)]);
}

describe("runtime scenarios", () => {
  test("builds scenario metadata and explicit diagram source", () => {
    const ws = workspace(
      [
        ":::building-block",
        "id: bb-api",
        "title: API Gateway",
        ":::",
        ":::runtime-scenario",
        "id: scenario-checkout",
        "title: Customer checkout",
        "trigger: Customer submits an order",
        "involves: bb-api",
        ":::",
        ":::diagram",
        "id: checkout-sequence",
        "scenario: scenario-checkout",
        "notation: mermaid-sequence",
        "aliases: bb_api=bb-api",
        ":::",
        "```mermaid",
        "sequenceDiagram",
        "    participant bb_api as API Gateway",
        "    bb_api->>bb_api: Handle request",
        "```",
      ].join("\n"),
    );

    expect(ws.parseErrors).toEqual([]);
    expect(ws.elements).toHaveLength(2);
    expect(ws.diagrams).toHaveLength(1);
    expect(ws.diagrams![0]!.source).toContain("sequenceDiagram");
  });

  test("indexes involves references bidirectionally", () => {
    const ws = workspace(
      ":::building-block\nid: bb-api\ntitle: API\n:::\n:::runtime-scenario\nid: scenario-api\ntitle: Request\ninvolves: bb-api\n:::",
    );
    const index = buildIndex(ws);
    expect(index.refsFrom.get("scenario-api")).toEqual(["bb-api"]);
    expect(index.refsTo.get("bb-api")).toEqual(["scenario-api"]);
  });

  test("reports empty and invalid involves values", () => {
    const empty = workspace(":::runtime-scenario\nid: scenario-empty\ntitle: Empty\n:::");
    expect(validate(empty, buildIndex(empty)).some((d) => d.code === "W011")).toBe(true);

    const invalid = workspace(
      ":::concept\nid: concept-api\ntitle: API\n:::\n:::runtime-scenario\nid: scenario-invalid\ntitle: Invalid\ninvolves: concept-api, bb-missing\n:::",
    );
    const e002 = validate(invalid, buildIndex(invalid)).filter((d) => d.code === "E002");
    expect(e002).toHaveLength(2);
    expect(e002.some((d) => d.message.includes("building-block"))).toBe(true);
    expect(e002.some((d) => d.message.includes("bb-missing"))).toBe(true);
  });

  test("reports uncovered interfaces only when endpoints are not together in one scenario", () => {
    const uncovered = workspace(
      [
        ":::building-block",
        "id: bb-a",
        "title: A",
        ":::",
        ":::building-block",
        "id: bb-b",
        "title: B",
        ":::",
        ":::interface",
        "id: if-a-b",
        "title: A to B",
        "between: bb-a, bb-b",
        ":::",
        ":::runtime-scenario",
        "id: scenario-a",
        "title: A only",
        "involves: bb-a",
        ":::",
      ].join("\n"),
    );
    expect(validate(uncovered, buildIndex(uncovered)).some((d) => d.code === "H011")).toBe(true);

    const covered = workspace(
      `${uncovered.documents[0]!.nodes.filter(
        (node) => node.kind !== "block" || node.blockType !== "runtime-scenario",
      )
        .map(() => "")
        .join("\n")}`,
    );
    // Use a direct model fixture for the positive case to keep this assertion independent of prose layout.
    covered.elements.push({
      kind: "building-block",
      id: "bb-a",
      title: "A",
      implements: [],
      loc: { file: "runtime.arc42.md", line: 1 },
    });
    covered.elements.push({
      kind: "building-block",
      id: "bb-b",
      title: "B",
      implements: [],
      loc: { file: "runtime.arc42.md", line: 2 },
    });
    covered.elements.push({
      kind: "interface",
      id: "if-covered",
      title: "A to B",
      between: ["bb-a", "bb-b"],
      loc: { file: "runtime.arc42.md", line: 3 },
    });
    covered.elements.push({
      kind: "runtime-scenario",
      id: "scenario-covered",
      title: "A to B",
      involves: ["bb-a", "bb-b"],
      loc: { file: "runtime.arc42.md", line: 4 },
    });
    expect(validate(covered, buildIndex(covered)).some((d) => d.code === "H011")).toBe(false);
  });

  test("does not combine participants from separate scenarios for H011", () => {
    const ws = workspace(
      [
        ":::building-block",
        "id: bb-a",
        "title: A",
        ":::",
        ":::building-block",
        "id: bb-b",
        "title: B",
        ":::",
        ":::interface",
        "id: if-a-b",
        "title: A to B",
        "between: bb-a, bb-b",
        ":::",
        ":::runtime-scenario",
        "id: scenario-a",
        "title: A",
        "involves: bb-a",
        ":::",
        ":::runtime-scenario",
        "id: scenario-b",
        "title: B",
        "involves: bb-b",
        ":::",
      ].join("\n"),
    );
    expect(validate(ws, buildIndex(ws)).some((d) => d.code === "H011")).toBe(true);
  });

  test("validates Mermaid sequences and leaves state diagrams unsupported", () => {
    const valid = workspace(
      [
        ":::building-block",
        "id: bb-api",
        "title: API",
        ":::",
        ":::runtime-scenario",
        "id: scenario-api",
        "title: API request",
        "involves: bb-api",
        ":::",
        ":::diagram",
        "id: api-sequence",
        "scenario: scenario-api",
        "notation: mermaid-sequence",
        "aliases: bb_api=bb-api",
        ":::",
        "```mermaid",
        "sequenceDiagram",
        "    participant bb_api as API",
        "    bb_api->>bb_api: Handle request",
        "```",
      ].join("\n"),
    );
    expect(validate(valid, buildIndex(valid)).some((d) => d.code === "E008")).toBe(false);

    const state = workspace(
      [
        ":::runtime-scenario",
        "id: scenario-state",
        "title: Lifecycle",
        ":::",
        ":::diagram",
        "id: lifecycle",
        "scenario: scenario-state",
        "notation: mermaid-state",
        ":::",
        "```mermaid",
        "stateDiagram-v2",
        "    [*] --> pending",
        "```",
      ].join("\n"),
    );
    const e008 = validate(state, buildIndex(state)).filter((d) => d.code === "E008");
    expect(e008).toHaveLength(1);
    expect(e008[0]!.message).toContain("unsupported notation");
  });

  test("parses common sequence arrows without including arrow characters in endpoints", () => {
    const ws = workspace(
      [
        ":::building-block",
        "id: bb-a",
        "title: A",
        ":::",
        ":::building-block",
        "id: bb-b",
        "title: B",
        ":::",
        ":::runtime-scenario",
        "id: scenario-arrows",
        "title: Arrow forms",
        "involves: bb-a, bb-b",
        ":::",
        ":::diagram",
        "id: arrow-forms",
        "scenario: scenario-arrows",
        "notation: mermaid-sequence",
        "aliases: bb_a=bb-a, bb_b=bb-b",
        ":::",
        "```mermaid",
        "sequenceDiagram",
        "    participant bb_a as A",
        "    participant bb_b as B",
        "    bb_a->>bb_b: Call",
        "    bb_b-->>bb_a: Return",
        "    bb_a->bb_b: Async",
        "    bb_b-->bb_a: Response",
        "```",
      ].join("\n"),
    );
    expect(validate(ws, buildIndex(ws)).some((d) => d.code === "E008")).toBe(false);
  });

  test("requires explicit alias when participant identifier is not a valid model ID", () => {
    // bb_api (underscore) is not a model ID — without an alias it must produce E008
    const ws = workspace(
      [
        ":::building-block",
        "id: bb-api",
        "title: API",
        ":::",
        ":::runtime-scenario",
        "id: scenario-api",
        "title: API request",
        "involves: bb-api",
        ":::",
        ":::diagram",
        "id: api-sequence",
        "scenario: scenario-api",
        "notation: mermaid-sequence",
        ":::",
        "```mermaid",
        "sequenceDiagram",
        "    participant bb_api as API",
        "    bb_api->>bb_api: Handle request",
        "```",
      ].join("\n"),
    );
    const e008 = validate(ws, buildIndex(ws)).filter((d) => d.code === "E008");
    expect(e008.some((d) => d.message.includes("unknown participant"))).toBe(true);
  });
});
