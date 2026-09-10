import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function diagnosticsFor(content: string, file = "05-building-blocks.arc42.md") {
  const workspace = buildWorkspace([parseMarkdown(file, content)]);
  const knownPaths = ["packages/core/src/index.ts", "packages/cli/src/cli.ts", "docs/arc42"];
  return validate(workspace, buildIndex(workspace), {
    pathEvidence: { knownPaths, root: "/repo" },
  }).filter((d) => d.code === "H020");
}

const bb = `:::building-block
id: bb-core
title: Core
path: packages/core
:::`;

describe("H020 — duplicate interface implementation paths", () => {
  test("no diagnostic when a single interface has a path", () => {
    expect(
      diagnosticsFor(`
${bb}

:::interface
id: if-a
title: A
provider: bb-core
path: packages/core/src/index.ts
:::
`),
    ).toHaveLength(0);
  });

  test("reports two interfaces pointing to the same path", () => {
    const diags = diagnosticsFor(`
${bb}

:::interface
id: if-a
title: A
provider: bb-core
path: packages/core/src/index.ts
:::

:::interface
id: if-b
title: B
provider: bb-core
path: packages/core/src/index.ts
:::
`);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.severity).toBe("hint");
    expect(diags[0]?.message).toContain("if-a");
    expect(diags[0]?.message).toContain("if-b");
    expect(diags[0]?.message).toContain("packages/core/src/index.ts");
  });

  test("reports three interfaces sharing a path — one diagnostic per extra interface", () => {
    const diags = diagnosticsFor(`
${bb}

:::interface
id: if-a
title: A
provider: bb-core
path: packages/core/src/index.ts
:::

:::interface
id: if-b
title: B
provider: bb-core
path: packages/core/src/index.ts
:::

:::interface
id: if-c
title: C
provider: bb-core
path: packages/core/src/index.ts
:::
`);
    // Two diagnostics: one for if-b, one for if-c
    expect(diags).toHaveLength(2);
  });

  test("does not fire for interfaces with different paths", () => {
    expect(
      diagnosticsFor(`
${bb}

:::interface
id: if-a
title: A
provider: bb-core
path: packages/core/src/index.ts
:::

:::interface
id: if-b
title: B
provider: bb-core
path: packages/cli/src/cli.ts
:::
`),
    ).toHaveLength(0);
  });

  test("does not fire for bb+interface sharing a path (W018 concern, not H020)", () => {
    expect(
      diagnosticsFor(`
${bb}

:::interface
id: if-a
title: A
provider: bb-core
path: packages/core/src/index.ts
:::
`),
    ).toHaveLength(0);
  });
});
