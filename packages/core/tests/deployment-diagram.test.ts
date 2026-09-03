import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

function workspace(content: string) {
  return buildWorkspace([parseMarkdown("deployment.arc42.md", content)]);
}

function validModel(diagram: string) {
  return workspace(
    `:::building-block
id: bb-api
title: API
:::
:::building-block
id: bb-db
title: Database
:::
:::deployment-node
id: env-prod
title: Production
type: environment
:::
:::deployment-node
id: region-main
title: Primary region
type: cloud-region
parent: env-prod
hosts: bb-api, bb-db
:::
${diagram}`,
  );
}

const source = `architecture-beta
    group env-prod(cloud)[Production]
    group region-main(cloud)[Primary region] in env-prod
    service bb-api(server)[API] in region-main
    service bb-db(database)[Database] in region-main
    bb-api:R --> L:bb-db`;

describe("deployment diagrams", () => {
  test("parses and validates an unscoped Mermaid deployment view", () => {
    const ws = validModel(`:::diagram
id: prod-view
view: deployment
notation: mermaid-architecture
:::
\`\`\`mermaid
${source}
\`\`\``);

    expect(ws.parseErrors).toEqual([]);
    expect(ws.diagrams).toHaveLength(1);
    expect(ws.diagrams[0]).toMatchObject({
      diagramType: "deployment",
      view: "deployment",
      roots: [],
      aliases: "",
    });
    expect(validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010")).toEqual(
      [],
    );
  });

  test("resolves explicit aliases without normalizing identifiers", () => {
    const ws = validModel(`:::diagram
id: prod-view
view: deployment
notation: mermaid-architecture
aliases: prod_env=env-prod, main_region=region-main, api_service=bb-api, db_service=bb-db
:::
\`\`\`mermaid
architecture-beta
    group prod_env(cloud)[Production]
    group main_region(cloud)[Primary region] in prod_env
    service api_service(server)[API] in main_region
    service db_service(database)[Database] in main_region
    api_service:R --> L:db_service
\`\`\``);

    expect(validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010")).toEqual(
      [],
    );
  });

  test("rejects malformed and duplicate aliases", () => {
    const ws = validModel(`:::diagram
id: prod-view
view: deployment
notation: mermaid-architecture
aliases: env=env-prod, env=region-main, other=env-prod, malformed, empty=
:::
\`\`\`mermaid
${source}
\`\`\``);

    const errors = validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010");
    expect(
      errors.some((diagnostic) => diagnostic.message.includes("duplicate alias safe id")),
    ).toBe(true);
    expect(
      errors.some((diagnostic) => diagnostic.message.includes("duplicate alias model id")),
    ).toBe(true);
    expect(errors.some((diagnostic) => diagnostic.message.includes("exactly one"))).toBe(true);
    expect(errors.some((diagnostic) => diagnostic.message.includes("non-empty"))).toBe(true);
  });

  test("rejects duplicate declarations and undeclared nesting parents", () => {
    const ws = validModel(`:::diagram
id: malformed-view
view: deployment
notation: mermaid-architecture
:::
\`\`\`mermaid
architecture-beta
    group env-prod(cloud)[Production]
    group env-prod(cloud)[Duplicate]
    service bb-api(server)[API] in missing-group
\`\`\``);

    const errors = validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010");
    expect(errors.some((diagnostic) => diagnostic.message.includes("duplicate declaration"))).toBe(
      true,
    );
    expect(errors.some((diagnostic) => diagnostic.message.includes("undeclared group"))).toBe(true);
  });

  test("roots scope declarations to selected deployment subtrees", () => {
    const ws = workspace(
      `:::building-block
id: bb-api
title: API
:::
:::building-block
id: bb-db
title: Database
:::
:::deployment-node
id: env-prod
title: Production
:::
:::deployment-node
id: region-main
title: Primary region
parent: env-prod
hosts: bb-api
:::
:::deployment-node
id: region-other
title: Other region
parent: env-prod
hosts: bb-db
:::
:::diagram
id: main-view
view: deployment
notation: mermaid-architecture
roots: region-main
:::
\`\`\`mermaid
architecture-beta
    group region-main(cloud)[Primary region]
    service bb-api(server)[API] in region-main
\`\`\``,
    );

    expect(validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010")).toEqual(
      [],
    );
  });

  test("rejects roots of the wrong kind and out-of-scope declarations", () => {
    const ws = workspace(
      `:::building-block
id: bb-api
title: API
:::
:::deployment-node
id: env-prod
title: Production
hosts: bb-api
:::
:::diagram
id: invalid-view
view: deployment
notation: mermaid-architecture
roots: bb-api
:::
\`\`\`mermaid
architecture-beta
    group env-prod(cloud)[Production]
    service bb-api(server)[API] in env-prod
\`\`\``,
    );

    const errors = validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010");
    expect(
      errors.some((diagnostic) => diagnostic.message.includes("must reference a deployment-node")),
    ).toBe(true);
  });

  test("requires every edge endpoint to be declared in the same diagram", () => {
    const ws = validModel(`:::diagram
id: broken-view
view: deployment
notation: mermaid-architecture
:::
\`\`\`mermaid
architecture-beta
    group env-prod(cloud)[Production]
    service bb-api(server)[API] in env-prod
    bb-api --> undeclared
\`\`\``);

    expect(
      validate(ws, buildIndex(ws)).some(
        (diagnostic) =>
          diagnostic.code === "E010" && diagnostic.message.includes("undeclared endpoint"),
      ),
    ).toBe(true);
  });

  test("uses an unscoped mapping diagnostic when a building block is not hosted", () => {
    const ws = validModel(`:::building-block
id: bb-unhosted
title: Unhosted
:::
:::diagram
id: unscoped-view
view: deployment
notation: mermaid-architecture
:::
\`\`\`mermaid
architecture-beta
    group env-prod(cloud)[Production]
    service bb-unhosted(server)[Unhosted] in env-prod
\`\`\``);

    expect(
      validate(ws, buildIndex(ws)).some(
        (diagnostic) =>
          diagnostic.code === "E010" &&
          diagnostic.message.includes("not mapped to a deployment node"),
      ),
    ).toBe(true);
  });

  test("rejects duplicate ids shared by runtime and deployment diagrams", () => {
    const ws = validModel(`:::diagram
id: shared-view
view: deployment
notation: mermaid-architecture
:::
\`\`\`mermaid
${source}
\`\`\`
:::diagram
id: shared-view
scenario: missing-scenario
notation: mermaid-sequence
:::
\`\`\`mermaid
sequenceDiagram
\`\`\``);

    expect(
      validate(ws, buildIndex(ws)).some(
        (diagnostic) =>
          diagnostic.code === "E010" && diagnostic.message.includes("duplicate diagram id"),
      ),
    ).toBe(true);
  });

  test("reports unknown roots and unsupported deployment notation with E010", () => {
    const ws = validModel(`:::diagram
id: invalid-view
view: deployment
notation: plantuml-deployment
roots: missing-root
:::
\`\`\`plantuml
@startuml
@enduml
\`\`\``);

    const errors = validate(ws, buildIndex(ws)).filter((diagnostic) => diagnostic.code === "E010");
    expect(
      errors.some((diagnostic) => diagnostic.message.includes("unknown deployment root")),
    ).toBe(true);
    expect(errors.some((diagnostic) => diagnostic.message.includes("unsupported notation"))).toBe(
      true,
    );
  });

  test("keeps Runtime View diagnostics under E008", () => {
    const ws = workspace(`:::runtime-scenario
id: scenario-api
title: API request
:::
:::diagram
id: runtime-view
scenario: scenario-api
notation: mermaid-sequence
:::
\`\`\`mermaid
sequenceDiagram
    participant unknown
\`\`\``);

    const diagnostics = validate(ws, buildIndex(ws));
    expect(diagnostics.some((diagnostic) => diagnostic.code === "E008")).toBe(true);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "E010")).toBe(false);
  });
});
