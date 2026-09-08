import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function diagnosticsFor(content: string, file = "test.arc42.md") {
  const workspace = buildWorkspace([parseMarkdown(file, content)]);
  return validate(workspace, buildIndex(workspace)).filter(
    (diagnostic) => diagnostic.code === "W027",
  );
}

const provider = `:::building-block
id: bb-provider
title: Provider
:::`;

const iface = `:::interface
id: if-provider
title: Provider Contract
provider: bb-provider
:::`;

describe("W027 — interfaces are provider building-block subchapters", () => {
  test("accepts an interface directly beneath its provider", () => {
    expect(
      diagnosticsFor(`## Provider\n\n${provider}\n\n### Provider Contract\n\n${iface}`),
    ).toHaveLength(0);
  });

  test("reports an interface kept in an unrelated section", () => {
    const diagnostics = diagnosticsFor(
      `## Provider\n\n${provider}\n\n## Interfaces\n\n### Provider Contract\n\n${iface}`,
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("direct subheading");
  });

  test("reports an interface without a heading in a building-block document", () => {
    const diagnostics = diagnosticsFor(`${provider}\n\n${iface}`);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("beneath providing building block");
  });

  test("does not constrain context-view interface descriptions", () => {
    expect(
      diagnosticsFor(
        `## Actor Interface\n\n${iface.replace("bb-provider", "bb-context")}`,
        "03-system-context.arc42.md",
      ),
    ).toHaveLength(0);
  });
});
