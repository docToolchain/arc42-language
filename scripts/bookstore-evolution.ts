/**
 * The bookstore architecture evolves: the story told by the diff demo, the
 * live "architecture evolution" page of the documentation site and the
 * showcase pull request of the architecture review.
 *
 * Starting from examples/bookstore-backend (tagged v1.0 in a story
 * repository), four commits and a final change:
 * 1. feat: add book recommendations — new service + API, gateway, diagram, deployment
 * 2. perf: move catalog search to Go — technology, prose, new decision
 * 3. style: reflow the API Gateway section — formatting only (no model change)
 * 4. refactor: rename Response Cache to Read Cache — heading and title
 * 5. SMS notifications are retired (contract and gateway), and the Message Queue's
 *    technology changes without a prose update (a lint warning); left
 *    uncommitted in a story repository, committed in the showcase PR.
 *
 * Usage (Node 24):
 *   node --experimental-strip-types scripts/bookstore-evolution.ts repo <dir>
 *     Create a Git repository at <dir> telling the whole story.
 *   node --experimental-strip-types scripts/bookstore-evolution.ts commit <workspace>
 *     Apply the story to a bookstore workspace of the current repository,
 *     one commit per step (the last step included).
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BOOKSTORE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../examples/bookstore-backend",
);

const CONTEXT = "03-context.arc42.md";
const BB = "05-building-blocks.arc42.md";
const DEPLOYMENT = "07-deployment-view.arc42.md";
const IGNORE = ":::ignore H014 This is only a demo for the arc42, code is out of scope:::";

export interface EvolutionStep {
  /** Commit message: subject, then body paragraphs. */
  message: string[];
  apply(workspace: string): void;
}

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function edit(workspace: string, file: string, from: string | RegExp, to: string) {
  const path = join(workspace, file);
  const content = readFileSync(path, "utf8");
  // A replacer function keeps "$&" and friends in `to` literal.
  const next = content.replace(from, () => to);
  if (next === content) throw new Error(`Story edit did not apply to ${file}: ${String(from)}`);
  writeFileSync(path, next);
}

/** The four commits on top of v1.0, oldest first. */
export const EVOLUTION: EvolutionStep[] = [
  {
    message: [
      "feat: add book recommendations",
      "Readers asked for **personalised suggestions**. A new Recommendation Service ranks books by order history; the gateway exposes it at `/recommendations`.",
    ],
    apply(workspace) {
      edit(
        workspace,
        BB,
        "\n## Order Service\n",
        `
## Recommendation Service

The Recommendation Service suggests books to readers. It ranks titles by a reader's order history and by what similar readers bought, and reads product details from the Catalog Service so that suggestions never show stale prices.

\`\`\`arc42
${IGNORE}

:::building-block
id: bb-recommendation-service
title: Recommendation Service
technology: Python / FastAPI
implements: concept-logging, concept-error-handling
requires: if-order-catalog
:::
\`\`\`

### Recommendation API

The gateway forwards \`/recommendations\` requests to this contract.

\`\`\`arc42
${IGNORE}

:::interface
id: if-gateway-recommend
title: Recommendation API
provider: bb-recommendation-service
protocol: HTTP/JSON
:::
\`\`\`

## Order Service
`,
      );
      edit(
        workspace,
        BB,
        "requires: if-gateway-catalog, if-gateway-order, if-gateway-auth",
        "requires: if-gateway-catalog, if-gateway-order, if-gateway-auth, if-gateway-recommend",
      );
      edit(
        workspace,
        BB,
        "and routes requests to the appropriate downstream service.",
        "and routes requests to the appropriate downstream service, including personalised book recommendations.",
      );
      edit(
        workspace,
        BB,
        '    bb-order-service["Order Service\\n(Node.js / Express)"]\n',
        '    bb-order-service["Order Service\\n(Node.js / Express)"]\n    bb-recommendation-service["Recommendation Service\\n(Python / FastAPI)"]\n',
      );
      edit(
        workspace,
        BB,
        '    bb-api-gateway -->|"if-gateway-auth"| bb-auth-service\n',
        '    bb-api-gateway -->|"if-gateway-auth"| bb-auth-service\n    bb-api-gateway -->|"if-gateway-recommend"| bb-recommendation-service\n    bb-recommendation-service -->|"if-order-catalog"| bb-catalog-service\n',
      );
      edit(
        workspace,
        DEPLOYMENT,
        "reducing operational overhead for the small team.",
        "reducing operational overhead for the small team. The Recommendation Service joins as one more ECS service.",
      );
      edit(
        workspace,
        DEPLOYMENT,
        "(one task per service instead of the production minimum of two).",
        "(one task per service instead of the production minimum of two), including the Recommendation Service.",
      );
      edit(
        workspace,
        DEPLOYMENT,
        "hosts: bb-catalog-service, bb-order-service, bb-auth-service, bb-notification-service\n",
        "hosts: bb-catalog-service, bb-order-service, bb-auth-service, bb-notification-service, bb-recommendation-service\n",
      );
      edit(
        workspace,
        DEPLOYMENT,
        "hosts: bb-api-gateway, bb-catalog-service, bb-order-service, bb-auth-service, bb-notification-service\n",
        "hosts: bb-api-gateway, bb-catalog-service, bb-order-service, bb-auth-service, bb-notification-service, bb-recommendation-service\n",
      );
    },
  },
  {
    message: [
      "perf: move catalog search to Go",
      "Load tests showed **340 ms p95** for search on Node.js. The Go rewrite meets the 200 ms target.",
    ],
    apply(workspace) {
      edit(
        workspace,
        BB,
        "id: bb-catalog-service\ntitle: Catalog Service\ntechnology: Node.js / Express",
        "id: bb-catalog-service\ntitle: Catalog Service\ntechnology: Go",
      );
      edit(
        workspace,
        BB,
        "This caching strategy is critical for meeting the 200ms p95 search latency target.",
        "Together with the Go runtime, this caching strategy keeps search well within the 200ms p95 latency target.",
      );
      edit(
        workspace,
        BB,
        'bb-catalog-service["Catalog Service\\n(Node.js / Express)"]',
        'bb-catalog-service["Catalog Service\\n(Go)"]',
      );
      writeFileSync(
        join(workspace, "09-decisions.arc42.md"),
        `${readFileSync(join(workspace, "09-decisions.arc42.md"), "utf8").trimEnd()}

## Go for Catalog Search

Load tests showed the Node.js catalog search at 340ms p95 under peak traffic, well above the 200ms target. A Go implementation of the same endpoints stays below 120ms with a fraction of the memory, and the team already runs Go in other products.

\`\`\`arc42
:::decision
id: dec-go-catalog
title: Implement the Catalog Service in Go
status: accepted
date: 2026-09-01
addresses: qg-performance
:::
\`\`\`
`,
      );
    },
  },
  {
    message: ["style: reflow the API Gateway section"],
    apply(workspace) {
      edit(
        workspace,
        BB,
        "It terminates TLS, validates JWT tokens, enforces rate limits, and routes",
        "It terminates TLS,\nvalidates JWT tokens, enforces rate limits, and routes",
      );
    },
  },
  {
    message: ["refactor: rename Response Cache to Read Cache"],
    apply(workspace) {
      edit(workspace, BB, "## Response Cache\n", "## Read Cache\n");
      edit(workspace, BB, "id: bb-cache\ntitle: Response Cache", "id: bb-cache\ntitle: Read Cache");
      edit(
        workspace,
        BB,
        'bb-cache["Response Cache\\n(Redis 7)"]',
        'bb-cache["Read Cache\\n(Redis 7)"]',
      );
    },
  },
];

/** The change after the last commit: a removal and a drift the lint warns about. */
export const LATEST: EvolutionStep = {
  message: [
    "chore: retire SMS notifications and move to SQS FIFO",
    "SMS delivery is dropped. The message queue moves to **FIFO** queues — but its section still describes the old queue, which the architecture review flags.",
  ],
  apply(workspace) {
    edit(workspace, CONTEXT, '    actor-sms["SMS Gateway"]\n', "");
    edit(workspace, CONTEXT, '    actor-sms -->|"if-notify-sms"| bb-notification-service\n', "");
    edit(workspace, CONTEXT, /## SMS Gateway \(AWS SNS\)\n[\s\S]*?:::\n```\n\n?/, "");
    edit(workspace, BB, /### SMS Delivery Contract\n[\s\S]*?:::\n```\n\n/, "");
    edit(
      workspace,
      BB,
      "id: bb-message-queue\ntitle: Message Queue\ntechnology: AWS SQS",
      "id: bb-message-queue\ntitle: Message Queue\ntechnology: AWS SQS FIFO",
    );
  },
};

function commitAll(root: string, message: string[], paths: string[] = ["-A"]) {
  git(root, "add", ...paths);
  git(root, "commit", "-q", ...message.flatMap((paragraph) => ["-m", paragraph]));
}

/**
 * Create a Git repository at `root` with the bookstore example as its first
 * commit, tagged `v1.0` — the starting point of both demos.
 */
export function createBookstoreRepository(root: string): void {
  cpSync(BOOKSTORE_DIR, root, { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "architect@example.com");
  git(root, "config", "user.name", "Bookstore Architect");
  commitAll(root, ["docs: initial bookstore architecture"]);
  git(root, "tag", "v1.0");
}

/** Create a repository at `root` telling the whole story; the latest change stays uncommitted. */
export function createEvolutionRepository(root: string): void {
  createBookstoreRepository(root);
  for (const step of EVOLUTION) {
    step.apply(root);
    commitAll(root, step.message);
  }
  LATEST.apply(root);
}

/** Apply the whole story to `workspace` inside its repository, one commit per step. */
export function commitEvolution(workspace: string): void {
  for (const step of [...EVOLUTION, LATEST]) {
    step.apply(workspace);
    commitAll(workspace, step.message, ["--", "."]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, target] = process.argv.slice(2);
  if (command === "repo" && target) {
    if (existsSync(target)) throw new Error(`${target} already exists`);
    createEvolutionRepository(resolve(target));
  } else if (command === "commit" && target) {
    commitEvolution(resolve(target));
  } else {
    console.error("Usage: bookstore-evolution.ts repo <dir> | commit <workspace>");
    process.exit(2);
  }
}
