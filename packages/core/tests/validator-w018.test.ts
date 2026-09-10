import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function diagnosticsFor(content: string, file = "05-building-blocks.arc42.md") {
  const workspace = buildWorkspace([parseMarkdown(file, content)]);
  // W018 requires pathEvidence to be active
  const knownPaths = [
    "packages/core",
    "packages/core/src/model",
    "packages/cli",
    "packages/core/src/index.ts",
  ];
  return validate(workspace, buildIndex(workspace), {
    pathEvidence: { knownPaths, root: "/repo" },
  }).filter((d) => d.code === "W018");
}

// ---------------------------------------------------------------------------
// Existing W018 behaviour (nested paths without parent relationship)
// ---------------------------------------------------------------------------

describe("W018 — building-block implementation path overlap (existing)", () => {
  test("no diagnostic for non-overlapping paths", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-a
title: A
path: packages/core
:::

:::building-block
id: bb-b
title: B
path: packages/cli
:::
`),
    ).toHaveLength(0);
  });

  test("no diagnostic for nested paths WITH correct parent relationship", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-parent
title: Parent
path: packages/core
:::

:::building-block
id: bb-child
title: Child
parent: bb-parent
path: packages/core/src/model
:::
`),
    ).toHaveLength(0);
  });

  test("reports nested paths without parent relationship", () => {
    const diags = diagnosticsFor(`
:::building-block
id: bb-parent
title: Parent
path: packages/core
:::

:::building-block
id: bb-child
title: Child
path: packages/core/src/model
:::
`);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("bb-parent");
    expect(diags[0]?.message).toContain("bb-child");
  });
});

// ---------------------------------------------------------------------------
// New W018 behaviour — identical building-block paths
// ---------------------------------------------------------------------------

describe("W018 — duplicate building-block paths (new)", () => {
  test("no diagnostic when a single bb has a path", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-core
title: Core
path: packages/core
:::
`),
    ).toHaveLength(0);
  });

  test("reports two building-blocks with identical paths", () => {
    const diags = diagnosticsFor(`
:::building-block
id: bb-core
title: Core
path: packages/core
:::

:::building-block
id: bb-core-alt
title: Core Alt
path: packages/core
:::
`);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("bb-core");
    expect(diags[0]?.message).toContain("bb-core-alt");
    expect(diags[0]?.message).toContain("packages/core");
  });

  test("reports three building-blocks all sharing a path — one diagnostic per pair", () => {
    const diags = diagnosticsFor(`
:::building-block
id: bb-a
title: A
path: packages/core
:::

:::building-block
id: bb-b
title: B
path: packages/core
:::

:::building-block
id: bb-c
title: C
path: packages/core
:::
`);
    // 3 pairs: (a,b), (a,c), (b,c)
    expect(diags).toHaveLength(3);
  });

  test("no diagnostic for two bbs with empty paths", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-a
title: A
:::

:::building-block
id: bb-b
title: B
:::
`),
    ).toHaveLength(0);
  });

  test("does not fire for interface with same path as a bb (different kinds)", () => {
    // W018 only checks bb-vs-bb; interface-vs-interface is H020
    expect(
      diagnosticsFor(`
:::building-block
id: bb-core
title: Core
path: packages/core
:::

:::interface
id: if-core
title: Core API
provider: bb-core
path: packages/core/src/index.ts
:::
`),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Existing W018 behaviour (nested paths without parent relationship)
// ---------------------------------------------------------------------------

describe("W018 — building-block implementation path overlap (existing)", () => {
  test("no diagnostic for non-overlapping paths", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-a
title: A
path: packages/core
:::

:::building-block
id: bb-b
title: B
path: packages/cli
:::
`),
    ).toHaveLength(0);
  });

  test("no diagnostic for nested paths WITH correct parent relationship", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-parent
title: Parent
path: packages/core
:::

:::building-block
id: bb-child
title: Child
parent: bb-parent
path: packages/core/src/model
:::
`),
    ).toHaveLength(0);
  });

  test("reports nested paths without parent relationship", () => {
    const diags = diagnosticsFor(`
:::building-block
id: bb-parent
title: Parent
path: packages/core
:::

:::building-block
id: bb-child
title: Child
path: packages/core/src/model
:::
`);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("bb-parent");
    expect(diags[0]?.message).toContain("bb-child");
  });
});

// ---------------------------------------------------------------------------
// New W018 behaviour — identical paths
// ---------------------------------------------------------------------------

describe("W018 — duplicate building-block paths (new)", () => {
  test("no diagnostic when a single bb has a path", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-core
title: Core
path: packages/core
:::
`),
    ).toHaveLength(0);
  });

  test("reports two building-blocks with identical paths", () => {
    const diags = diagnosticsFor(`
:::building-block
id: bb-core
title: Core
path: packages/core
:::

:::building-block
id: bb-core-alt
title: Core Alt
path: packages/core
:::
`);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("bb-core");
    expect(diags[0]?.message).toContain("bb-core-alt");
    expect(diags[0]?.message).toContain("packages/core");
  });

  test("reports three building-blocks all sharing a path — one diagnostic per pair", () => {
    const diags = diagnosticsFor(`
:::building-block
id: bb-a
title: A
path: packages/core
:::

:::building-block
id: bb-b
title: B
path: packages/core
:::

:::building-block
id: bb-c
title: C
path: packages/core
:::
`);
    // 3 pairs: (a,b), (a,c), (b,c)
    expect(diags).toHaveLength(3);
  });

  test("no diagnostic for two bbs with empty paths", () => {
    expect(
      diagnosticsFor(`
:::building-block
id: bb-a
title: A
:::

:::building-block
id: bb-b
title: B
:::
`),
    ).toHaveLength(0);
  });
});
