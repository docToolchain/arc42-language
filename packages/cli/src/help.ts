const COMMANDS = [
  ["validate", "Check architecture documents for consistency and rule violations."],
  ["get", "Browse or inspect elements from an architecture workspace."],
  ["rules", "List the validation rules and the rationale behind them."],
  ["explain", "Explain the syntax and purpose of arc42 block types."],
  ["guide", "Guide a one-time migration from existing docs or source to typed arc42."],
  ["diff", "Report architecture-document changes that need review."],
  ["serve", "Serve the workspace in the browser for interactive exploration."],
  ["init", "Create starter architecture files or install the agent skill."],
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
  if (command === "validate") {
    return `arc42 validate — check architecture documents

Usage:
  arc42 [--dir <path>] [--root <path>] validate [options]

Options:
  --format <text|json>  Output diagnostics as text or JSON (default: text)
  --quiet               Print only errors and omit the summary
  --strict              Also exit 1 when hints are found
  -h, --help            Show this help

The command reads *.arc42.md files from the workspace, validates the model, and exits 0
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

Arguments:
  <block-type>          Explain one block type; omit it to list all block types

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
  arc42 [--dir <path>] diff [<reference>] [options]

Arguments:
  <reference>           Git revision used as the comparison base

Options:
  --staged, --cached    Compare the index with HEAD, or with <reference>
  --strict              Also exit 1 when hint findings are found
  -h, --help            Show this help

Without a flag, the command compares the working tree with the index. With <reference>,
it compares the working tree with that revision. Consistency findings exit 1; set
ARC42_CONSISTENT to the displayed base commit after reviewing them. Advisory path hints do not
fail the command unless --strict is supplied. Git, parsing, and other operational errors exit 1.

Examples:
  arc42 diff                         # working tree versus index
  arc42 diff main                    # working tree versus main
  arc42 diff --staged                # index versus HEAD
  arc42 diff --cached origin/main    # index versus origin/main
`;
  }

  if (command === "serve") {
    return `arc42 serve — serve the architecture workspace in a browser

Usage:
  arc42 [--dir <path>] serve [options]

Options:
  --port <number>       HTTP port (default: 3142)
  --open                Open the browser after starting the server
  -h, --help            Show this help

The server watches the selected directory recursively and refreshes the browser when
*.arc42.md files change. It exits 1 when the workspace or web assets cannot be loaded.
Use --dir or ARC42_DIR to select the workspace.
`;
  }

  if (command === "init") {
    if (nestedCommand === "skill") {
      return `arc42 init skill — install the arc42 agent skill

Usage:
  arc42 init skill [--path <destination>]

Options:
  --path <destination>  Install at this path (default: .agents/skills/arc42/SKILL.md)
  -h, --help            Show this help

The destination must not already exist. The command exits 0 when installed and 1 when
the bundled skill is unavailable or the destination already exists.
`;
    }
    if (nestedCommand === "template") {
      return `arc42 init template — scaffold arc42 chapter templates

Usage:
  arc42 init template [--dir <path>]

Options:
  --dir <path>          Destination directory (default: current directory)
  -h, --help            Show this help

The command copies all bundled chapter templates and skips files that already exist. It
exits 0 after copying and 1 when templates cannot be loaded.
`;
    }
    return `arc42 init — create files for a new arc42 workspace

Usage:
  arc42 init skill [--path <destination>]
  arc42 init template [--dir <path>]

Subcommands:
  skill                 Install the agent skill
  template              Copy starter architecture templates

Use arc42 init <subcommand> --help for options and defaults.
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
