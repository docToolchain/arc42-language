import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";
import type { Diagnostic, ValidationOptions } from "./types.ts";
import { builtinRules } from "./rules/index.ts";

const STALE_IGNORE_CODE = "W019";

function applyIgnoreDirectives(workspace: Workspace, diagnostics: Diagnostic[]): Diagnostic[] {
  const directives = workspace.ignoreDirectives ?? [];
  for (const directive of directives) directive.used = false;
  const suppressed = new Set<Diagnostic>();

  // A directive belongs to the following source element and suppresses one
  // matching finding there. Assigning in source order keeps a directive tied
  // to the nearest subsequent finding, independent of rule execution order.
  for (const directive of [...directives].sort((a, b) => a.line - b.line)) {
    const diagnostic = diagnostics
      .filter(
        (candidate) =>
          !suppressed.has(candidate) &&
          candidate.file === directive.file &&
          candidate.code.toUpperCase() === directive.ruleCode.toUpperCase() &&
          candidate.line >= directive.line,
      )
      .sort((a, b) => a.line - b.line)[0];
    if (diagnostic) {
      directive.used = true;
      suppressed.add(diagnostic);
    }
  }

  const kept = diagnostics.filter((diagnostic) => !suppressed.has(diagnostic));

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
