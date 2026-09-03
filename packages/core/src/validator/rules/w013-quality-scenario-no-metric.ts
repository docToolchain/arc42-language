import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";

export const w013QualityScenarioNoMetric: Rule = {
  meta: {
    code: "W013",
    severity: "warning",
    type: "problem",
    docs: {
      description: "Quality scenario has no metric — cannot be used for architecture evaluation",
      rationale:
        "A quality scenario without a measurable metric is aspirational but not testable. Without a metric, you cannot use it for ATAM evaluation or acceptance testing. Add a metric that names a threshold and a measurement method (e.g. 'p95 response time < 500ms under 1000 concurrent users').",
      arc42Chapter: 10,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    return workspace.elements
      .filter((el) => el.kind === "quality-scenario" && !el.metric)
      .map((el) => ({
        code: "W013",
        severity: "warning" as const,
        message: `Quality scenario '${el.id}' has no metric — add a measurable acceptance criterion`,
        file: el.loc.file,
        line: el.loc.line,
      }));
  },
};
