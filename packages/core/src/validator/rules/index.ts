/**
 * Rule registry — single source of truth for all built-in arc42 validation rules.
 * Each rule is a self-describing object with metadata usable for documentation,
 * the `arc42 rules` CLI command, and SKILL.md generation.
 *
 * Rule shape is ESLint-inspired (meta.docs, type) with arc42-specific extensions.
 */
import type { Rule } from "../types.ts";
import { e001DuplicateId } from "./e001-duplicate-id.ts";
import { e002UnresolvedReference } from "./e002-unresolved-reference.ts";
import { e003CircularParent } from "./e003-circular-parent.ts";
import { e004InterfaceBetweenNonBlock } from "./e004-interface-between-non-block.ts";
import { e005ParseError } from "./e005-parse-error.ts";
import { e006SupersededDecisionNoSupersedes } from "./e006-superseded-decision-no-supersedes.ts";
import { e007MultipleSolutionStrategies } from "./e007-multiple-solution-strategies.ts";
import { e008DiagramValidation } from "./e008-diagram-validation.ts";
import { e009DeploymentNodeCycle } from "./e009-deployment-node-cycle.ts";
import { e010DeploymentDiagramValidation } from "./e010-deployment-diagram-validation.ts";
import { w001ConceptNotImplemented } from "./w001-concept-not-implemented.ts";
import { w002IsolatedBuildingBlock } from "./w002-isolated-building-block.ts";
import { w003StaleProposedDecision } from "./w003-stale-proposed-decision.ts";
import { w004BlockWithoutProse } from "./w004-block-without-prose.ts";
import { w005MultipleBlocksUnderHeading } from "./w005-multiple-blocks-under-heading.ts";
import { w006TooFewQualityGoals } from "./w006-too-few-quality-goals.ts";
import { w007TooManyQualityGoals } from "./w007-too-many-quality-goals.ts";
import { w008DecisionNoDate } from "./w008-decision-no-date.ts";
import { w009RiskNoMitigation } from "./w009-risk-no-mitigation.ts";
import { w011RuntimeScenarioNoInvolves } from "./w011-runtime-scenario-no-involves.ts";
import { w012BuildingBlockUnmapped } from "./w012-building-block-unmapped.ts";
import { w013QualityScenarioNoMetric } from "./w013-quality-scenario-no-metric.ts";
import { w014QualityGoalsNotDescendingPriority } from "./w014-quality-goals-not-descending-priority.ts";
import { h001DecisionNoAddresses } from "./h001-decision-no-addresses.ts";
import { h002QualityGoalUnaddressed } from "./h002-quality-goal-unaddressed.ts";
import { h003BuildingBlockNoTechnology } from "./h003-building-block-no-technology.ts";
import { h004BuildingBlockUnreferencedByInterface } from "./h004-building-block-unreferenced-by-interface.ts";
import { h005ConceptsNeverImplemented } from "./h005-concepts-never-implemented.ts";
import { h006ConstraintUnaddressed } from "./h006-constraint-unaddressed.ts";
import { h007RiskUnaddressed } from "./h007-risk-unaddressed.ts";
import { h008ActorNoInterface } from "./h008-actor-no-interface.ts";
import { h009SolutionStrategyNoAddresses } from "./h009-solution-strategy-no-addresses.ts";
import { h010QualityGoalUnaddressedBySolutionStrategy } from "./h010-quality-goal-unaddressed-by-solution-strategy.ts";
import { h011InterfaceNotCoveredByRuntimeScenario } from "./h011-interface-not-covered-by-runtime-scenario.ts";
import { h012EmptyDeploymentNode } from "./h012-empty-deployment-node.ts";
import { h013QualityGoalNoScenario } from "./h013-quality-goal-no-scenario.ts";

export const builtinRules: readonly Rule[] = [
  // Errors — structural / broken references
  e005ParseError, // All chapters (parse errors)
  e001DuplicateId, // All chapters
  e002UnresolvedReference, // All chapters
  e003CircularParent, // Chapter 5
  e004InterfaceBetweenNonBlock, // Chapter 5
  e006SupersededDecisionNoSupersedes, // Chapter 9
  e007MultipleSolutionStrategies, // Chapter 4
  e008DiagramValidation, // Chapter 6
  e009DeploymentNodeCycle, // Chapter 7
  e010DeploymentDiagramValidation, // Chapter 7

  // Warnings — inconsistencies
  w001ConceptNotImplemented, // Chapter 8
  w002IsolatedBuildingBlock, // Chapter 5
  w003StaleProposedDecision, // Chapter 9
  w004BlockWithoutProse, // All chapters
  w005MultipleBlocksUnderHeading, // All chapters
  w006TooFewQualityGoals, // Chapter 10
  w007TooManyQualityGoals, // Chapter 10
  w008DecisionNoDate, // Chapter 9
  w009RiskNoMitigation, // Chapter 11
  w011RuntimeScenarioNoInvolves, // Chapter 6
  w012BuildingBlockUnmapped, // Chapter 7
  w013QualityScenarioNoMetric, // Chapter 10
  w014QualityGoalsNotDescendingPriority, // Chapter 10

  // Hints — best practices
  h001DecisionNoAddresses, // Chapter 9
  h002QualityGoalUnaddressed, // Chapter 10
  h003BuildingBlockNoTechnology, // Chapter 5
  h004BuildingBlockUnreferencedByInterface, // Chapter 5
  h005ConceptsNeverImplemented, // Chapter 8
  h006ConstraintUnaddressed, // Chapter 2
  h007RiskUnaddressed, // Chapter 11
  h008ActorNoInterface, // Chapter 3
  h009SolutionStrategyNoAddresses, // Chapter 4
  h010QualityGoalUnaddressedBySolutionStrategy, // Chapter 10
  h011InterfaceNotCoveredByRuntimeScenario, // Chapter 6
  h012EmptyDeploymentNode, // Chapter 7
  h013QualityGoalNoScenario, // Chapter 10
];

/** All rules indexed by code for O(1) lookup */
export const rulesByCode: ReadonlyMap<string, Rule> = new Map(
  builtinRules.map((r) => [r.meta.code, r]),
);
