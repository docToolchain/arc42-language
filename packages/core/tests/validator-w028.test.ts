import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function diagnosticsFor(content: string) {
  const workspace = buildWorkspace([parseMarkdown("03-context.arc42.md", content)]);
  return validate(workspace, buildIndex(workspace)).filter(
    (diagnostic) => diagnostic.code === "W028",
  );
}

const actor = `:::actor
id: actor-user
title: User
type: person
requires: if-api
:::`;

const provider = `:::building-block
id: bb-api
title: API
:::`;

const internal = `:::building-block
id: bb-database
title: Database
:::`;

const api = `:::interface
id: if-api
title: API
provider: bb-api
:::`;

const database = `:::interface
id: if-database
title: Database
provider: bb-database
:::`;

function contextDiagram(nodes: string) {
  return `\`\`\`arc42
:::diagram
id: context
view: context
notation: mermaid
:::
\`\`\`

\`\`\`mermaid
graph TD
${nodes}
\`\`\``;
}

describe("W028 — context diagrams contain actor-facing building blocks", () => {
  test("accepts a building block that provides an actor-required interface", () => {
    expect(
      diagnosticsFor(
        `${actor}\n${provider}\n${api}\n${contextDiagram("    actor-user[User]\n    bb-api[API]\n    actor-user --> bb-api")}`,
      ),
    ).toHaveLength(0);
  });

  test("reports a building block that is only an internal provider", () => {
    const diagnostics = diagnosticsFor(
      `${actor}\n${provider}\n${internal}\n${api}\n${database}\n${contextDiagram("    actor-user[User]\n    bb-api[API]\n    bb-database[Database]\n    actor-user --> bb-api\n    bb-api --> bb-database")}`,
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("bb-database");
  });

  test("does not report actors or unknown ids as building blocks", () => {
    expect(
      diagnosticsFor(
        `${actor}\n${provider}\n${api}\n${contextDiagram("    actor-user[User]\n    bb-api[API]\n    actor-user --> bb-api")}`,
      ),
    ).toHaveLength(0);
  });
});
