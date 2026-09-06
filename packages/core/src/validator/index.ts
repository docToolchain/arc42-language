import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";
import type { Diagnostic, ValidationOptions } from "./types.ts";
import { builtinRules } from "./rules/index.ts";

const STALE_IGNORE_CODE = "W019";

function applyIgnoreDirectives(workspace: Workspace, diagnostics: Diagnostic[]): Diagnostic[] {
  const directives = workspace.ignoreDirectives ?? [];
  for (const directive of directives) directive.used = false;
  const kept: Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    let suppressed = false;
    for (const directive of directives) {
      if (
        directive.file === diagnostic.file &&
        directive.ruleCode.toUpperCase() === diagnostic.code.toUpperCase()
      ) {
        directive.used = true;
        suppressed = true;
      }
    }
    if (!suppressed) kept.push(diagnostic);
  }

  const stale = directives
    .filter((directive) => !directive.used)
    .map(
      (directive): Diagnostic => ({
        code: STALE_IGNORE_CODE,
        severity: "warning",
        message: `Ignore directive for '${directive.ruleCode}' did not suppress any diagnostic`,
        file: directive.file,
        line: directive.line,
      }),
    );
  return [...kept, ...stale];
}

export function validate(
  workspace: Workspace,
  index: ReferenceIndex,
  options?: ValidationOptions,
): Diagnostic[] {
  const diagnostics = builtinRules.flatMap((rule) => rule.check(workspace, index, options));
  return applyIgnoreDirectives(workspace, diagnostics);
}
