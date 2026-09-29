import { createValidator } from "@cli42/lib/validator";
import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";
import type { Diagnostic, ValidationContext } from "./types.ts";
import { builtinRules } from "./rules/index.ts";
import { mermaidSyntax } from "./mermaid-syntax.ts";

const validator = createValidator({
  rules: builtinRules,
  syntax: mermaidSyntax,
});

export function validate(
  workspace: Workspace,
  index: ReferenceIndex,
  context?: ValidationContext,
): Diagnostic[] {
  return validator.validate(workspace, index, context);
}

export function validateAsync(
  workspace: Workspace,
  index: ReferenceIndex,
  context?: ValidationContext,
): Promise<Diagnostic[]> {
  return validator.validateAsync(workspace, index, context);
}
