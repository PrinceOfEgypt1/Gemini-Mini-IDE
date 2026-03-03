/**
 * @fileoverview Barrel export para o Policy & Invariant Engine do ESAA v2.
 * @module esaa/policy
 */

export { PolicyEngine, globalPolicyEngine } from "./policy-engine.js";
export type { AgentPermissions, PolicyEvaluationResult } from "./policy-engine.js";

export { InvariantEngine, globalInvariantEngine } from "./invariant-engine.js";
export type { InvariantCheckResult, InvariantViolation } from "./invariant-engine.js";
