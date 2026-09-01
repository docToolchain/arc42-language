import { expect, test, describe } from "vite-plus/test";
import { buildWorkspace } from "../src/model/builder.ts";
import type { DocumentAst } from "../src/ast.ts";

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
      },
    ],
  };
}

describe("buildWorkspace", () => {
  test("valid quality-goal → correct element", () => {
    const ws = buildWorkspace([
      doc("quality-goal\nid: qg-1\ntitle: Perf\npriority: high"),
    ]);
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
    const ws = buildWorkspace([
      doc("interface\nid: i-1\ntitle: I\nbetween: a, b, c"),
    ]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/between.*exactly 2/);
  });

  test("invalid priority → ParseError", () => {
    const ws = buildWorkspace([
      doc("quality-goal\nid: qg-1\ntitle: P\npriority: critical"),
    ]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/priority/);
  });

  test("building-block implements parsed as array", () => {
    const ws = buildWorkspace([
      doc("building-block\nid: bb-1\ntitle: X\nimplements: c-a, c-b"),
    ]);
    const el = ws.elements[0]!;
    if (el.kind !== "building-block") throw new Error();
    expect(el.implements).toEqual(["c-a", "c-b"]);
  });

  test("decision addresses parsed as array", () => {
    const ws = buildWorkspace([
      doc("decision\nid: d-1\ntitle: D\nstatus: accepted\naddresses: qg-1, qg-2"),
    ]);
    const el = ws.elements[0]!;
    if (el.kind !== "decision") throw new Error();
    expect(el.addresses).toEqual(["qg-1", "qg-2"]);
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
    const ws = buildWorkspace([
      doc("actor\nid: actor-1\ntitle: External Service"),
    ]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/type.*actor/i);
  });

  test("actor with system type → correct enum value", () => {
    const ws = buildWorkspace([
      doc("actor\nid: actor-2\ntitle: Payment API\ntype: system"),
    ]);
    const el = ws.elements[0]!;
    if (el.kind !== "actor") throw new Error();
    expect(el.type).toBe("system");
  });

  test("actor with invalid type enum → ParseError", () => {
    const ws = buildWorkspace([
      doc("actor\nid: actor-1\ntitle: X\ntype: external-system"),
    ]);
    expect(ws.elements).toHaveLength(0);
    expect(ws.parseErrors[0]!.message).toMatch(/type.*actor.*person.*system/i);
  });
});
