const COMMANDS = [
  ["validate", "Check architecture documents for consistency and rule violations."],
  ["get", "Browse or inspect elements from an architecture workspace."],
  ["coverage", "Show which top-level source paths are claimed by the architecture model."],
  ["rules", "List the validation rules and the rationale behind them."],
  ["explain", "Explain the syntax and purpose of arc42 block types."],
  ["guide", "Guide a one-time migration from existing docs or source to typed arc42."],
  ["diff", "Report architecture-document changes that need review."],
  ["serve", "Serve the workspace in the browser for interactive exploration."],
  ["build", "Build a self-contained static site from a workspace for deployment."],
] as const;

export function rootHelp(): string {
  return `arc42 — validate and query arc42 DSL files

Usage:
  arc42 [global options] <command> [command options]
  arc42 --help [command]

Commands:
${COMMANDS.map(([name, purpose]) => `  ${name.padEnd(9)} ${purpose}`).join("\n")}

Global options:
  --dir <path>   Workspace root (default: $ARC42_DIR or the discovered directory)
  --root <path>  Repository root for implementation paths (default: auto-detected)
  -h, --help     Show command help
  -v, --version  Show the installed version

Use arc42 <command> --help for command syntax, options, defaults, and exit behavior.

Environment:
  ARC42_DIR      Default workspace directory when --dir is not supplied
`;
}

export function commandHelp(
  command: string,
  nestedCommand?: string,
  blockTypes?: readonly string[],
): string | undefined {
  if (command === "coverage") {
    return `arc42 coverage — show path coverage of the architecture model

Usage:
  arc42 [--dir <path>] coverage [options]

Options:
  --format <text|json|tree>  Output format (default: text)
  -h, --help                 Show this help

The command lists top-level source path segments (derived from git ls-files or the
filesystem) and shows which ones are claimed by at least one building-block or
interface element with a path field. Uncovered segments are intentional gaps —
test-only paths, tooling, or docs that are not part of the modeled architecture.

Formats:
  text  Covered and uncovered paths in flat lists with claimant IDs
  json  Full coverage result as JSON
  tree  Hierarchical tree merging covered (✓) and uncovered (✗) paths

The command always exits 0.
`;
  }

  if (command === "validate") {
    return `arc42 validate — check architecture documents

Usage:
  arc42 [--dir <path>] [--root <path>] validate [options]

Options:
  --format <text|json>  Output diagnostics as text or JSON (default: text)
  --quiet               Print only errors and omit the summary
  --strict              Also exit 1 when hints are found
  -h, --help            Show this help

The command reads *.arc42.md or *.arc42.adoc files from the workspace, validates the model, and exits 0
when it is valid. It exits 1 when errors are found and 2 for invalid command options.
`;
  }

  if (command === "get") {
    return `arc42 get — browse or inspect architecture elements

Usage:
  arc42 [--dir <path>] get [<id>] [options]

Arguments:
  <id>                  Show one element and its relationships; omit it for the workspace

Options:
  --type <block-type>   Filter workspace results by block type
                        Use --type ignore to list all ignore directives
  --format <format>     Output format: text, json, or markdown (default: text)
  -h, --help            Show this help
${blockTypes ? `\nBlock types:\n  ${blockTypes.join(", ")}\n` : ""}
The command exits 0 when the requested workspace or element is found, 1 when an element
is missing, and 2 for an invalid type, format, or option.
`;
  }

  if (command === "rules") {
    return `arc42 rules — list validation rules

Usage:
  arc42 rules [options]

Options:
  --chapter <number>    Show rules for one arc42 chapter
  --format <text|json>  Output rule descriptions as text or JSON (default: text)
  -h, --help            Show this help

The command exits 0 after listing the rules and 2 for invalid command options.
`;
  }

  if (command === "explain") {
    return `arc42 explain — explain arc42 block syntax

Usage:
  arc42 explain [<block-type>] [options]
  arc42 explain diagram [<type>] [options]
  arc42 explain ignore [options]

Arguments:
  <block-type>          Explain one block type; omit it to list all block types
  diagram               Explain diagram types instead of block types
  ignore                Explain the :::ignore directive syntax and constraints

Options:
  --format <text|json>  Output the explanation as text or JSON (default: text)
  -h, --help            Show this help

The command exits 0 after printing an explanation and 2 for an unknown block type or
invalid command option.
`;
  }

  if (command === "diff") {
    return `arc42 diff — report architecture changes

Usage:
  arc42 [--dir <path>] diff [<reference> | <base>..<head> | <base>...<head>] [options]

Arguments:
  <reference>           Git revision used as the comparison base
  <base>..<head>        Compare two commits
  <base>...<head>       Compare <head> with the merge base of both (the changes of a branch)

Options:
  --staged, --cached    Compare the index with HEAD, or with <reference>
  --strict              Also exit 1 when hint findings are found
  --format <text|json>  Output format (default: text). json adds the semantic change set
  -h, --help            Show this help

Without a flag, the command compares the working tree with the index. With <reference>,
it compares the working tree with that revision. A commit range cannot be combined with
--staged. Architecture changes are compared semantically: reformatted blocks and reflowed
prose are not changes. Consistency findings exit 1; set
ARC42_CONSISTENT to the displayed base commit after reviewing them. Advisory path hints do not
fail the command unless --strict is supplied. Git, parsing, and other operational errors exit 1.

Examples:
  arc42 diff                         # working tree versus index
  arc42 diff main                    # working tree versus main
  arc42 diff --staged                # index versus HEAD
  arc42 diff --cached origin/main    # index versus origin/main
  arc42 diff origin/main...HEAD      # changes of the current branch, as in a pull request
  arc42 diff main...HEAD --format json  # findings and changed elements for tooling and agents
`;
  }

  if (command === "serve") {
    return `arc42 serve — serve the architecture workspace in a browser

Usage:
  arc42 [--dir <path>] serve [options]
  arc42 [--dir <path>] serve --diff [<reference> | <base>..<head> | <base>...<head>] [--staged]

Options:
  --port <number>       HTTP port (default: 3142)
  --open                Open the browser after starting the server
  --diff                Visualize one architecture difference; takes the same comparison
                        arguments as \`arc42 diff\` (default: working tree versus index)
  --staged              With --diff: compare the index with HEAD, or with <reference>
  -h, --help            Show this help

The server watches the selected directory recursively and refreshes the browser when
*.arc42.md or *.arc42.adoc files change, and follows the Git index and HEAD. Inside a Git
repository the browser also offers the architecture history: every commit that touched the
architecture documents, computed lazily as it scrolls into view.
It exits 1 when the workspace, the difference or the web assets cannot be loaded.
Use --dir or ARC42_DIR to select the workspace.

Examples:
  arc42 serve --open
  arc42 serve --diff                 # uncommitted changes, live
  arc42 serve --diff main...HEAD     # the changes of the current branch
`;
  }

  if (command === "build") {
    return `arc42 build — build a self-contained static site from a workspace

Usage:
  arc42 [--dir <path>] build --out <dir> [options]
  arc42 [--dir <path>] build --out <dir> --diff [<reference> | <base>..<head> | <base>...<head>]

Options:
  --out <dir>           Output directory (required)
  --base <url-path>     Base URL path for assets, e.g. /docs/ (default: ./)
  --diff                Include one architecture difference, frozen at build time; takes the
                        same comparison arguments as \`arc42 diff\`
  --staged              With --diff: compare the index with HEAD, or with <reference>
  --with-history        Include the architecture history (every commit that touched the
                        architecture documents, plus uncommitted changes) as JSONL files
                        in <out>/history/; requires a Git repository
  -h, --help            Show this help

The command reads the workspace, copies the bundled web assets to --out, and injects
the workspace data so the site works without a server. The output directory is
created if it does not exist and overwritten if it does.

It exits 0 on success, 1 when the workspace or web assets cannot be loaded, and 2
for invalid command options.

Examples:
  arc42 build --out site/docs
  arc42 --dir examples/bookstore-backend build --out site/bookstore --base /bookstore/
  arc42 build --out review --diff origin/main...HEAD   # architecture review site for a pull request
  arc42 build --out site/docs --with-history           # documentation with its change history
`;
  }

  if (command === "guide") {
    if (nestedCommand === "chapter") {
      return `arc42 guide chapter — guide authoring for one arc42 chapter

Usage:
  arc42 guide chapter <1-12>

The output includes chapter dependencies, evidence prompts, relevant explain commands, and the
generated starter template. It never creates or modifies files.
`;
    }
    if (nestedCommand === "evidence") {
      return `arc42 guide evidence — describe the migration evidence document

Usage:
  arc42 guide evidence

The output defines the separate traceability document maintained by chapter subagents. It never
creates or modifies files.
`;
    }
    if (nestedCommand === "migration") {
      return `arc42 guide migration — print the complete migration workflow

Usage:
  arc42 guide migration

The workflow covers template initialization, evidence capture, dependency-aware delegation, human
review, and final validation. It never creates or modifies files.
`;
    }
    return `arc42 guide — instructions for a one-time evidence-based migration

Usage:
  arc42 guide [migration]
  arc42 guide chapter <1-12>
  arc42 guide evidence

Subcommands:
  migration             Print the complete coordinator workflow (default)
  chapter <1-12>        Print one chapter brief and its starter template
  evidence              Print the separate evidence-document format

The guide is read-only. It requires human review for gaps, assumptions, contradictions, and final
validation findings; it never automatically fixes architecture documents.
`;
  }

  return undefined;
}
