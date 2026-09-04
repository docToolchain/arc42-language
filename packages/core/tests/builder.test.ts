import { expect, test, describe } from "vite-plus/test";
import { buildWorkspace } from "../src/model/builder.ts";
import type { DocumentAst } from "../src/ast.ts";
import type { AstNode } from "../src/ast.ts";

function doc(content: string): DocumentAst {
  // minimal helper — inline a single block
  const [blockType, ...attrLines] = content.split("\n").filter((l) => l.trim());
  const attributes: Record<string, string> = {};
  for (const line of attrLines ?? []) {
    const m = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
    if (m) attributes[m[1]!] = m[2]!;
  }
  return {
    filePath: "test.arc42.md",
    nodes: [
      {
        kind: "block",
        blockType: blockType ?? "",
        attributes,
        startLine: 1,
        endLine: attrLines!.length + 1,
        inArc42Fence: false,
      },
    ],
  };
}

function docWithHeading(headingText: string, content: string): DocumentAst {
  // helper — heading node followed by a block node
  const [blockType, ...attrLines] = content.split("\n").filter((l) => l.trim());
  const attributes: Record<string, string> = {};
  for (const line of attrLines ?? []) {
    const m = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
    if (m) attributes[m[1]!] = m[2]!;
  }
  const nodes: AstNode[] = [
    { kind: "heading", level: 2, text: headingText, line: 1 },
    {
      kind: "block",
      blockType: blockType ?? "",
      attributes,
      startLine: 3,
      endLine: 3 + (attrLines?.length ?? 0),
      inArc42Fence: false,
    },
  ];
  return { filePath: "test.arc42.md", nodes };
}

describe("buildWorkspace", () => {
  test("valid quality-goal → correct element", () => {
    const ws = buildWorkspace([doc("quality-goal\nid: qg-1\ntitle: Perf\npriority: high")]);
    expect(ws.elements).toHaveLength(1);
    const el = ws.elements[0]!;
    expect(el.kind).toBe("quality-goal");
    if (el.kind !== "quality-goal") throw new Error();
    expect(el.id).toBe("qg-1");
    expect(el.priority).toBe("high");
  });

  test("missing id → ParseError, no element", () => {
    const ws = buildWorkspace([doc("quality-goal\ntitle: Perf\npriority: high")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors).toHaveLength(1);
    expect(ws.parseErrors[0]!.message).toMatch(/id/);
  });

  test("unknown block type → ParseError", () => {
    const ws = buildWorkspace([doc("unknown-type\nid: x\ntitle: X")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/Unknown block type/);
  });

  test("interface.between with 3 items → ParseError", () => {
    const ws = buildWorkspace([doc("interface\nid: i-1\ntitle: I\nbetween: a, b, c")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/between.*exactly 2/);
  });

  test("invalid priority → ParseError", () => {
    const ws = buildWorkspace([doc("quality-goal\nid: qg-1\ntitle: P\npriority: critical")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/priority/);
  });

  test("building-block implements parsed as array", () => {
    const ws = buildWorkspace([doc("building-block\nid: bb-1\ntitle: X\nimplements: c-a, c-b")]);
    const el = ws.elements[0]!;
    if (el.kind !== "building-block") throw new Error();
    expect(el.implements).toEqual(["c-a", "c-b"]);
  });

  test("deployment-node parses optional type, hosts, and parent", () => {
    const ws = buildWorkspace([
      doc(
        "deployment-node\nid: node-prod\ntitle: Production\ntype: environment\nhosts: bb-api, bb-db\nparent: node-region",
      ),
    ]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements[0]).toEqual({
      kind: "deployment-node",
      id: "node-prod",
      title: "Production",
      type: "environment",
      hosts: ["bb-api", "bb-db"],
      parent: "node-region",
      loc: { file: "test.arc42.md", line: 1 },
    });
  });

  test("deployment-node rejects an invalid type", () => {
    const ws = buildWorkspace([doc("deployment-node\nid: node-1\ntitle: Node\ntype: workstation")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/deployment-node/);
  });

  test("decision addresses parsed as array", () => {
    const ws = buildWorkspace([
      doc("decision\nid: d-1\ntitle: D\nstatus: accepted\naddresses: qg-1, qg-2"),
    ]);
    const el = ws.elements[0]!;
    if (el.kind !== "decision") throw new Error();
    expect(el.addresses).toEqual(["qg-1", "qg-2"]);
  });

  test("solution strategy parses addresses and empty addresses", () => {
    const ws = buildWorkspace([
      doc("solution-strategy\nid: strategy-1\ntitle: Layered architecture\naddresses: qg-1, qg-2"),
      doc("solution-strategy\nid: strategy-2\ntitle: Unlinked strategy\naddresses:   "),
    ]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements).toHaveLength(2);
    const first = ws.elements[0]!;
    const second = ws.elements[1]!;
    if (first.kind !== "solution-strategy" || second.kind !== "solution-strategy")
      throw new Error();
    expect(first.addresses).toEqual(["qg-1", "qg-2"]);
    expect(second.addresses).toEqual([]);
  });

  test("solution strategy still requires id and title", () => {
    const missingId = buildWorkspace([doc("solution-strategy\ntitle: Strategy")]);
    const missingTitle = buildWorkspace([doc("solution-strategy\nid: strategy-1")]);
    expect(missingId.elements).toHaveLength(0);
    expect(missingId.parseErrors[0]!.message).toMatch(/id/);
    expect(missingTitle.elements).toHaveLength(0);
    expect(missingTitle.parseErrors[0]!.message).toMatch(/title/);
  });

  test("runtime-scenario parses trigger and involved building blocks", () => {
    const ws = buildWorkspace([
      doc(
        "runtime-scenario\nid: scenario-checkout\ntitle: Customer checkout\ntrigger: Customer submits an order\ninvolves: bb-api, bb-orders",
      ),
    ]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements).toHaveLength(1);
    const scenario = ws.elements[0]!;
    if (scenario.kind !== "runtime-scenario") throw new Error();
    expect(scenario.involves).toEqual(["bb-api", "bb-orders"]);
    expect(scenario.trigger).toBe("Customer submits an order");
  });

  test("runtime-scenario without involves gets an empty list", () => {
    const ws = buildWorkspace([doc("runtime-scenario\nid: scenario-empty\ntitle: Empty")]);
    const scenario = ws.elements[0]!;
    if (scenario.kind !== "runtime-scenario") throw new Error();
    expect(scenario.involves).toEqual([]);
  });

  test("valid actor → correct element with type and description", () => {
    const ws = buildWorkspace([
      doc("actor\nid: actor-1\ntitle: End User\ntype: person\ndescription: Primary human user"),
    ]);
    expect(ws.elements).toHaveLength(1);
    const el = ws.elements[0]!;
    expect(el.kind).toBe("actor");
    if (el.kind !== "actor") throw new Error();
    expect(el.id).toBe("actor-1");
    expect(el.title).toBe("End User");
    expect(el.type).toBe("person");
    expect(el.description).toBe("Primary human user");
  });

  test("actor without type → ParseError (type is required)", () => {
    const ws = buildWorkspace([doc("actor\nid: actor-1\ntitle: External Service")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/type.*actor/i);
  });

  test("actor with system type → correct enum value", () => {
    const ws = buildWorkspace([doc("actor\nid: actor-2\ntitle: Payment API\ntype: system")]);
    const el = ws.elements[0]!;
    if (el.kind !== "actor") throw new Error();
    expect(el.type).toBe("system");
  });

  test("actor with invalid type enum → ParseError", () => {
    const ws = buildWorkspace([doc("actor\nid: actor-1\ntitle: X\ntype: external-system")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/type.*actor.*person.*system/i);
  });

  test("valid quality-scenario → correct element shape", () => {
    const ws = buildWorkspace([
      doc(
        "quality-scenario\nid: qs-1\ntitle: Perf under load\nquality: qg-perf\nstimulus: 1000 concurrent users\nresponse: system handles all requests\nmetric: p95 < 500ms",
      ),
    ]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements).toHaveLength(1);
    const el = ws.elements[0]!;
    expect(el.kind).toBe("quality-scenario");
    if (el.kind !== "quality-scenario") throw new Error();
    expect(el.id).toBe("qs-1");
    expect(el.title).toBe("Perf under load");
    expect(el.quality).toBe("qg-perf");
    expect(el.stimulus).toBe("1000 concurrent users");
    expect(el.response).toBe("system handles all requests");
    expect(el.metric).toBe("p95 < 500ms");
  });

  test("quality-scenario without quality → ParseError", () => {
    const ws = buildWorkspace([doc("quality-scenario\nid: qs-1\ntitle: Perf scenario")]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors).toHaveLength(1);
    expect(ws.parseErrors[0]!.message).toMatch(/quality/);
  });

  test("quality-scenario optional fields absent → no error", () => {
    const ws = buildWorkspace([
      doc("quality-scenario\nid: qs-min\ntitle: Minimal\nquality: qg-perf"),
    ]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements).toHaveLength(1);
    const el = ws.elements[0]!;
    if (el.kind !== "quality-scenario") throw new Error();
    expect(el.stimulus).toBeUndefined();
    expect(el.response).toBeUndefined();
    expect(el.metric).toBeUndefined();
  });

  test("loc.heading is set from nearest preceding heading", () => {
    const ws = buildWorkspace([
      docWithHeading("REST API", "quality-goal\nid: qg-1\ntitle: Perf\npriority: high"),
    ]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements[0]!.loc.heading).toBe("REST API");
  });

  test("loc.heading is undefined when no heading precedes the block", () => {
    const ws = buildWorkspace([doc("quality-goal\nid: qg-1\ntitle: Perf\npriority: high")]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements[0]!.loc.heading).toBeUndefined();
  });

  test("loc.heading resets to new heading for subsequent blocks", () => {
    const docAst: DocumentAst = {
      filePath: "test.arc42.md",
      nodes: [
        { kind: "heading", level: 2, text: "First Section", line: 1 },
        {
          kind: "block",
          blockType: "quality-goal",
          attributes: { id: "qg-1", title: "Perf", priority: "high" },
          startLine: 3,
          endLine: 6,
          inArc42Fence: false,
        },
        { kind: "heading", level: 2, text: "Second Section", line: 8 },
        {
          kind: "block",
          blockType: "quality-goal",
          attributes: { id: "qg-2", title: "Security", priority: "medium" },
          startLine: 10,
          endLine: 13,
          inArc42Fence: false,
        },
      ],
    };
    const ws = buildWorkspace([docAst]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements[0]!.loc.heading).toBe("First Section");
    expect(ws.elements[1]!.loc.heading).toBe("Second Section");
  });

  test("loc.prose contains prose lines between heading and block", () => {
    const docAst: DocumentAst = {
      filePath: "test.arc42.md",
      nodes: [
        { kind: "heading", level: 2, text: "REST API", line: 1 },
        { kind: "prose", text: "The REST API is the main entry point.", line: 3 },
        { kind: "prose", text: "It handles authentication and routing.", line: 4 },
        {
          kind: "block",
          blockType: "building-block",
          attributes: { id: "bb-api", title: "API" },
          startLine: 6,
          endLine: 9,
          inArc42Fence: false,
        },
      ],
    };
    const ws = buildWorkspace([docAst]);
    expect(ws.parseErrors).toHaveLength(0);
    const el = ws.elements[0]!;
    expect(el.loc.prose).toBe(
      "The REST API is the main entry point.\nIt handles authentication and routing.",
    );
  });

  test("loc.prose is undefined when no prose precedes the block", () => {
    const ws = buildWorkspace([doc("quality-goal\nid: qg-1\ntitle: Perf\npriority: high")]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements[0]!.loc.prose).toBeUndefined();
  });

  test("loc.prose resets to new heading for subsequent blocks", () => {
    const docAst: DocumentAst = {
      filePath: "test.arc42.md",
      nodes: [
        { kind: "heading", level: 2, text: "Section A", line: 1 },
        { kind: "prose", text: "Prose for A.", line: 3 },
        {
          kind: "block",
          blockType: "quality-goal",
          attributes: { id: "qg-1", title: "Perf", priority: "high" },
          startLine: 5,
          endLine: 8,
          inArc42Fence: false,
        },
        { kind: "heading", level: 2, text: "Section B", line: 10 },
        { kind: "prose", text: "Prose for B.", line: 12 },
        {
          kind: "block",
          blockType: "quality-goal",
          attributes: { id: "qg-2", title: "Security", priority: "medium" },
          startLine: 14,
          endLine: 17,
          inArc42Fence: false,
        },
      ],
    };
    const ws = buildWorkspace([docAst]);
    expect(ws.parseErrors).toHaveLength(0);
    expect(ws.elements[0]!.loc.prose).toBe("Prose for A.");
    expect(ws.elements[1]!.loc.prose).toBe("Prose for B.");
  });
});
