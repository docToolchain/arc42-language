import type { Workspace } from "../model/types.ts";
import type { ReferenceIndex } from "../resolver/types.ts";
import type { Diagnostic } from "./types.ts";
import { builtinRules } from "./rules/index.ts";

export function validate(workspace: Workspace, index: ReferenceIndex): Diagnostic[] {
  return builtinRules.flatMap((rule) => rule.check(workspace, index));
}
