/**
 * @fileoverview Exports públicos do ESAA Hardened v2.
 *
 * Importar daqui para acessar o sistema ESAA do exterior.
 *
 * @module esaa
 */

// ── Orchestrator (ponto de entrada principal) ─────────────────────────────────
export {
  ESAAOrchestrator,
  getGlobalESAAOrchestrator,
  closeGlobalESAAOrchestrator,
  resetGlobalESAAOrchestrator,
} from "./orchestrator.js";
export type { ESAAConfig, ESAAHealthStatus } from "./orchestrator.js";

// ── Event Store ───────────────────────────────────────────────────────────────
export { EventStore, getGlobalEventStore, closeGlobalEventStore, resetGlobalEventStore } from "./store/event-store.js";
export type { AppendResult, EventQueryOptions } from "./store/event-store.js";

// ── Projections ───────────────────────────────────────────────────────────────
export { ProjectionEngine } from "./projections/projection-engine.js";

// ── Gateway ───────────────────────────────────────────────────────────────────
export { IntentionGateway } from "./gateway/intention-gateway.js";
export type { ProposeResult, ProposeOptions } from "./gateway/intention-gateway.js";

// ── Policy ────────────────────────────────────────────────────────────────────
export { PolicyEngine, globalPolicyEngine } from "./policy/policy-engine.js";
export { InvariantEngine, globalInvariantEngine } from "./policy/invariant-engine.js";
export type {
  AgentPermissions,
  PolicyEvaluationResult,
} from "./policy/policy-engine.js";
export type {
  InvariantCheckResult,
  InvariantViolation,
} from "./policy/invariant-engine.js";

// ── Workspace ─────────────────────────────────────────────────────────────────
export { WorkspaceExecutor } from "./workspace/workspace-executor.js";
export type {
  WorkspaceFile,
  Workspace,
  WorkspaceExecutionResult,
} from "./workspace/workspace-executor.js";

// ── Promotion ─────────────────────────────────────────────────────────────────
export { PromotionController } from "./promotion/promotion-controller.js";
export type {
  GateResult,
  PromotionResult,
  PromotionRequest,
} from "./promotion/promotion-controller.js";

// ── Recovery ──────────────────────────────────────────────────────────────────
export { RecoveryController } from "./recovery/recovery-controller.js";
export type {
  RecoveryResult,
  RecoveryOperation,
  QuarantineParams,
  ReinstateParams,
} from "./recovery/recovery-controller.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ESAAEvent,
  ESAAEventType,
  ESAAEventPayloadMap,
  IntentionType,
  RiskLevel,
  PromotionGateName,
} from "./types/events.js";

export type {
  Intention,
  ApprovedIntention,
  RejectedIntention,
  IntentionStatus,
  ConcurrencyCheckResult,
  IntentionPayloadMap,
} from "./types/intentions.js";

export type {
  OperationalProjection,
  AuditProjection,
  AgentState,
  ProjectionSnapshot,
} from "./types/projections.js";
