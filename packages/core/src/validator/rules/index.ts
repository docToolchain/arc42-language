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
import { w001ConceptNotImplemented } from "./w001-concept-not-implemented.ts";
import { w002IsolatedBuildingBlock } from "./w002-isolated-building-block.ts";
import { w003StaleProposedDecision } from "./w003-stale-proposed-decision.ts";
import { w004BlockWithoutProse } from "./w004-block-without-prose.ts";
import { w005MultipleBlocksUnderHeading } from "./w005-multiple-blocks-under-heading.ts";
import { h001DecisionNoAddresses } from "./h001-decision-no-addresses.ts";
import { h002QualityGoalUnaddressed } from "./h002-quality-goal-unaddressed.ts";
import { h003BuildingBlockNoTechnology } from "./h003-building-block-no-technology.ts";

export const builtinRules: readonly Rule[] = [
  // Errors — structural / broken references
  e005ParseError,           // Chapter 5 (also ch.1,8,9 via parse)
  e001DuplicateId,          // Chapter 5
  e002UnresolvedReference,  // Chapter 5
  e003CircularParent,       // Chapter 5
  e004InterfaceBetweenNonBlock, // Chapter 5

  // Warnings — inconsistencies
  w001ConceptNotImplemented,    // Chapter 8
  w002IsolatedBuildingBlock,    // Chapter 5
  w003StaleProposedDecision,    // Chapter 9
  w004BlockWithoutProse,        // All chapters
  w005MultipleBlocksUnderHeading, // All chapters

  // Hints — best practices
  h001DecisionNoAddresses,      // Chapter 9
  h002QualityGoalUnaddressed,   // Chapter 1
  h003BuildingBlockNoTechnology, // Chapter 5
];

/** All rules indexed by code for O(1) lookup */
export const rulesByCode: ReadonlyMap<string, Rule> = new Map(
  builtinRules.map((r) => [r.meta.code, r]),
);
