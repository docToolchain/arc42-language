import { describe, expect, test } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { commandHelp, rootHelp } from "../src/help.ts";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function runCli(...args: string[]): string {
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "--conditions=development", cliPath, ...args],
    { cwd: projectRoot, encoding: "utf8" },
  );
}

describe("CLI help", () => {
  test("root help lists every command with its purpose", () => {
    const help = rootHelp();
    for (const command of [
      "validate",
      "get",
      "rules",
      "explain",
      "guide",
      "diff",
      "serve",
      "init",
    ]) {
      expect(help).toContain(command);
    }
    expect(help).toContain("Check architecture documents for consistency");
    expect(help).toContain("Use arc42 <command> --help");
  });

  test("subcommand help explains usage and options", () => {
    expect(commandHelp("validate")).toContain("--format <text|json>");
    expect(commandHelp("diff")).toContain("--staged, --cached");
    expect(commandHelp("init", "template")).toContain("default: current directory");
    expect(commandHelp("guide")).toContain("guide chapter <1-12>");
    expect(commandHelp("guide", "chapter")).toContain("bundled starter template");
    expect(commandHelp("guide", "evidence")).toContain("evidence document");
    expect(commandHelp("guide", "migration")).toContain("complete migration workflow");
    // block types injected from outside — not hardcoded in help module
    const types = ["building-block", "decision", "risk"];
    expect(commandHelp("get", undefined, types)).toContain("building-block");
    expect(commandHelp("get")).not.toContain("building-block");
  });

  test("unknown commands have no command-specific help", () => {
    expect(commandHelp("unknown")).toBeUndefined();
  });

  test("the entry point accepts help before and after a command", () => {
    expect(runCli("--help")).toContain("Commands:");
    expect(runCli("validate", "--help")).toContain("arc42 validate");
    expect(runCli("--help", "diff")).toContain("working tree versus index");
    expect(runCli("init", "template", "--help")).toContain("scaffold arc42");
    expect(runCli("guide", "chapter", "1", "--help")).toContain("bundled starter template");
    expect(runCli("guide", "evidence", "--help")).toContain("evidence document");
    expect(runCli("guide", "migration", "--help")).toContain("complete migration workflow");
  });

  test("chapter guides include chapter content and the starter template", () => {
    for (let chapter = 1; chapter <= 12; chapter++) {
      const output = runCli("guide", "chapter", String(chapter));
      expect(output).toContain(`# Chapter ${chapter}:`);
      expect(output).toContain("## Content to capture");
      expect(output).toContain("## Starter template");
      expect(output).toContain("arc42 explain");
      expect(output).toContain("## Your role");
      expect(output).toContain("## Before you write");
      expect(output).toContain("## When you are done");
    }
  });

  test("migration and evidence guides define executable checkpoints", () => {
    const migration = runCli("guide", "migration");
    expect(migration).toContain("## Your role");
    expect(migration).toContain("## STOP — human review gate");
    expect(migration).toContain("## Step 6 — final validation");
    expect(migration).toContain("architecture-evidence.md");

    const text = runCli("guide", "evidence");
    expect(text).toContain("## Purpose");
    expect(text).toContain("Used in");
    expect(text).toContain("agent inference");
    expect(text).toContain("Derived fact or relationship");
    expect(text).toContain("Confidence");
  });
});
