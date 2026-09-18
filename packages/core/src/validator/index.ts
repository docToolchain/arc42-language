import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";
import type { Diagnostic, ValidationContext } from "./types.ts";
import { builtinRules, rulesByCode } from "./rules/index.ts";
import { suppressInvalidMermaidDiagnostics, validateMermaidSyntax } from "./mermaid-syntax.ts";

const STALE_IGNORE_CODE = "W019";
const ERROR_IGNORE_CODE = "W030";

/** Returns true if the rule code targets an error-severity rule (cannot be suppressed). */
function isErrorSeverityCode(ruleCode: string): boolean {
  const upper = ruleCode.toUpperCase();
  const rule = rulesByCode.get(upper);
  if (rule) return rule.meta.severity === "error";
  // Fallback: use the prefix heuristic for unknown/future codes
  return upper[0] === "E";
}

function applyIgnoreDirectives(workspace: Workspace, diagnostics: Diagnostic[]): Diagnostic[] {
  const directives = workspace.ignoreDirectives ?? [];
  for (const directive of directives) directive.used = false;

  // Partition directives: rejected (target E-severity) vs. allowed (W/H targets)
  const rejected = directives.filter((d) => isErrorSeverityCode(d.ruleCode));
  const allowed = directives.filter((d) => !isErrorSeverityCode(d.ruleCode));

  // Emit W030 for each rejected directive
  const rejectedDiags: Diagnostic[] = rejected.map(
    (d): Diagnostic => ({
      code: ERROR_IGNORE_CODE,
      severity: "warning",
      message: `Cannot suppress error-severity rule '${d.ruleCode}'; only warnings (W) and hints (H) can be ignored`,
      file: d.file,
      line: d.line,
    }),
  );

  const suppressed = new Set<Diagnostic>();

  // A directive belongs to the following source element and suppresses one
  // matching finding there. Assigning in source order keeps a directive tied
  // to the nearest subsequent finding, independent of rule execution order.
  for (const directive of [...allowed].sort((a, b) => a.line - b.line)) {
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

  const stale = allowed
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
  return [...kept, ...stale, ...rejectedDiags];
}

export function validate(
  workspace: Workspace,
  index: ReferenceIndex,
  context?: ValidationContext,
): Diagnostic[] {
  const diagnostics = builtinRules.flatMap((rule) => rule.check(workspace, index, context));
  return applyIgnoreDirectives(workspace, diagnostics);
}

export async function validateAsync(
  workspace: Workspace,
  index: ReferenceIndex,
  context?: ValidationContext,
): Promise<Diagnostic[]> {
  const syntaxDiagnostics = await validateMermaidSyntax(workspace);
  const ruleDiagnostics = builtinRules.flatMap((rule) => rule.check(workspace, index, context));
  const semanticDiagnostics = suppressInvalidMermaidDiagnostics(
    workspace,
    ruleDiagnostics,
    syntaxDiagnostics,
  );
  return applyIgnoreDirectives(workspace, [...semanticDiagnostics, ...syntaxDiagnostics]);
}
