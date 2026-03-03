/**
 * @fileoverview Projeção de Auditoria do ESAA Hardened v2.
 *
 * Mantém o histórico completo de todas as intenções, promoções e agentes.
 * Nunca apaga entradas — apenas adiciona.
 * Usado para observabilidade, debugging, compliance e replay.
 *
 * @module esaa/projections/audit-projection
 * @version 2.0.0
 */

import type {
  ESAAEvent,
  ESAAEventType,
  IntentionProposedPayload,
  IntentionApprovedPayload,
  IntentionRejectedPayload,
  ExecutionStartedPayload,
  ExecutionSucceededPayload,
  ExecutionFailedPayload,
  PromotionRequestedPayload,
  PromotionGatePassedPayload,
  PromotionGateFailedPayload,
  PromotionApprovedPayload,
  PromotionRejectedPayload,
  PromotionRolledBackPayload,
  AgentQuarantinedPayload,
  AgentReinstatedPayload,
} from "../types/events.js";
import type {
  AuditProjection,
  IntentionAuditEntry,
  PromotionAuditEntry,
  AgentAuditEntry,
} from "../types/projections.js";

// ─── Estado Inicial ──────────────────────────────────────────────────────────

/**
 * Estado inicial vazio da projeção de auditoria.
 */
export function createEmptyAuditProjection(): AuditProjection {
  return {
    lastAppliedVersion: 0,
    updatedAt: new Date().toISOString(),
    intentions: {},
    promotions: {},
    agents: [],
    correlationIndex: {},
  };
}

// ─── Aplicação de Eventos ────────────────────────────────────────────────────

/**
 * Aplica um evento à projeção de auditoria, retornando uma nova projeção.
 * Esta função é PURA: não modifica a projeção original.
 */
export function applyEventToAudit(
  projection: AuditProjection,
  event: ESAAEvent
): AuditProjection {
  const updated = applyAuditMutation(projection, event);

  return {
    ...updated,
    lastAppliedVersion: event.version,
    updatedAt: event.timestamp,
  };
}

/**
 * Aplica uma sequência de eventos à projeção de auditoria.
 */
export function replayEventsToAudit(
  events: ESAAEvent[],
  initial?: AuditProjection
): AuditProjection {
  const base = initial ?? createEmptyAuditProjection();
  return events.reduce(
    (proj, event) => applyEventToAudit(proj, event),
    base
  );
}

// ─── Mutadores por Tipo de Evento ────────────────────────────────────────────

function applyAuditMutation(
  projection: AuditProjection,
  event: ESAAEvent
): AuditProjection {
  switch (event.type as ESAAEventType) {
    case "INTENTION_PROPOSED":
      return onIntentionProposed(projection, event as ESAAEvent<IntentionProposedPayload>);

    case "INTENTION_APPROVED":
      return onIntentionApproved(projection, event as ESAAEvent<IntentionApprovedPayload>);

    case "INTENTION_REJECTED":
      return onIntentionRejected(projection, event as ESAAEvent<IntentionRejectedPayload>);

    case "EXECUTION_STARTED":
      return onExecutionStarted(projection, event as ESAAEvent<ExecutionStartedPayload>);

    case "EXECUTION_SUCCEEDED":
      return onExecutionSucceeded(projection, event as ESAAEvent<ExecutionSucceededPayload>);

    case "EXECUTION_FAILED":
      return onExecutionFailed(projection, event as ESAAEvent<ExecutionFailedPayload>);

    case "PROMOTION_REQUESTED":
      return onPromotionRequested(projection, event as ESAAEvent<PromotionRequestedPayload>);

    case "PROMOTION_GATE_PASSED":
      return onPromotionGatePassed(projection, event as ESAAEvent<PromotionGatePassedPayload>);

    case "PROMOTION_GATE_FAILED":
      return onPromotionGateFailed(projection, event as ESAAEvent<PromotionGateFailedPayload>);

    case "PROMOTION_APPROVED":
      return onPromotionApproved(projection, event as ESAAEvent<PromotionApprovedPayload>);

    case "PROMOTION_REJECTED":
      return onPromotionRejected(projection, event as ESAAEvent<PromotionRejectedPayload>);

    case "PROMOTION_ROLLED_BACK":
      return onPromotionRolledBack(projection, event as ESAAEvent<PromotionRolledBackPayload>);

    case "AGENT_QUARANTINED":
      return onAgentQuarantined(projection, event as ESAAEvent<AgentQuarantinedPayload>);

    case "AGENT_REINSTATED":
      return onAgentReinstated(projection, event as ESAAEvent<AgentReinstatedPayload>);

    default:
      return projection;
  }
}

function onIntentionProposed(
  projection: AuditProjection,
  event: ESAAEvent<IntentionProposedPayload>
): AuditProjection {
  const { intentionId, type, agentId, riskLevel } = event.payload;

  const entry: IntentionAuditEntry = {
    intentionId,
    correlationId: event.correlationId,
    agentId,
    type,
    riskLevel,
    proposedAt: event.timestamp,
    approvedAt: null,
    rejectedAt: null,
    executionStartedAt: null,
    executionEndedAt: null,
    outcome: "PENDING",
    failureReason: null,
    filesGenerated: [],
    durationMs: null,
  };

  const existingList = projection.correlationIndex[event.correlationId] ?? [];

  return {
    ...projection,
    intentions: { ...projection.intentions, [intentionId]: entry },
    correlationIndex: {
      ...projection.correlationIndex,
      [event.correlationId]: [...existingList, intentionId],
    },
  };
}

function onIntentionApproved(
  projection: AuditProjection,
  event: ESAAEvent<IntentionApprovedPayload>
): AuditProjection {
  const { intentionId } = event.payload;
  const existing = projection.intentions[intentionId];
  if (!existing) return projection;

  return {
    ...projection,
    intentions: {
      ...projection.intentions,
      [intentionId]: { ...existing, approvedAt: event.timestamp },
    },
  };
}

function onIntentionRejected(
  projection: AuditProjection,
  event: ESAAEvent<IntentionRejectedPayload>
): AuditProjection {
  const { intentionId, reason } = event.payload;
  const existing = projection.intentions[intentionId];
  if (!existing) return projection;

  return {
    ...projection,
    intentions: {
      ...projection.intentions,
      [intentionId]: {
        ...existing,
        rejectedAt: event.timestamp,
        outcome: "REJECTED",
        failureReason: reason,
      },
    },
  };
}

function onExecutionStarted(
  projection: AuditProjection,
  event: ESAAEvent<ExecutionStartedPayload>
): AuditProjection {
  const { intentionId } = event.payload;
  const existing = projection.intentions[intentionId];
  if (!existing) return projection;

  return {
    ...projection,
    intentions: {
      ...projection.intentions,
      [intentionId]: {
        ...existing,
        executionStartedAt: event.timestamp,
      },
    },
  };
}

function onExecutionSucceeded(
  projection: AuditProjection,
  event: ESAAEvent<ExecutionSucceededPayload>
): AuditProjection {
  const { intentionId, filePaths, durationMs } = event.payload;
  const existing = projection.intentions[intentionId];
  if (!existing) return projection;

  return {
    ...projection,
    intentions: {
      ...projection.intentions,
      [intentionId]: {
        ...existing,
        executionEndedAt: event.timestamp,
        outcome: "SUCCEEDED",
        filesGenerated: filePaths,
        durationMs,
      },
    },
  };
}

function onExecutionFailed(
  projection: AuditProjection,
  event: ESAAEvent<ExecutionFailedPayload>
): AuditProjection {
  const { intentionId, error, durationMs, attempt, maxAttempts } = event.payload;
  const existing = projection.intentions[intentionId];
  if (!existing) return projection;

  const isFinalFailure = attempt >= maxAttempts;

  return {
    ...projection,
    intentions: {
      ...projection.intentions,
      [intentionId]: {
        ...existing,
        executionEndedAt: isFinalFailure ? event.timestamp : existing.executionEndedAt,
        outcome: isFinalFailure ? "FAILED" : "PENDING",
        failureReason: isFinalFailure ? error : existing.failureReason,
        durationMs: isFinalFailure ? durationMs : existing.durationMs,
      },
    },
  };
}

function onPromotionRequested(
  projection: AuditProjection,
  event: ESAAEvent<PromotionRequestedPayload>
): AuditProjection {
  const { batchId, intentionId } = event.payload;

  const entry: PromotionAuditEntry = {
    batchId,
    correlationId: event.correlationId,
    intentionId,
    requestedAt: event.timestamp,
    outcome: "APPROVED", // optimistic; will be updated on rejection
    gateResults: [],
    promotedFiles: [],
    rolledBackAt: null,
    rollbackReason: null,
  };

  return {
    ...projection,
    promotions: { ...projection.promotions, [batchId]: entry },
  };
}

function onPromotionGatePassed(
  projection: AuditProjection,
  event: ESAAEvent<PromotionGatePassedPayload>
): AuditProjection {
  const { batchId, gate } = event.payload;
  const existing = projection.promotions[batchId];
  if (!existing) return projection;

  return {
    ...projection,
    promotions: {
      ...projection.promotions,
      [batchId]: {
        ...existing,
        gateResults: [
          ...existing.gateResults,
          { gate, passed: true, errors: [], testedAt: event.timestamp },
        ],
      },
    },
  };
}

function onPromotionGateFailed(
  projection: AuditProjection,
  event: ESAAEvent<PromotionGateFailedPayload>
): AuditProjection {
  const { batchId, gate, errors } = event.payload;
  const existing = projection.promotions[batchId];
  if (!existing) return projection;

  return {
    ...projection,
    promotions: {
      ...projection.promotions,
      [batchId]: {
        ...existing,
        gateResults: [
          ...existing.gateResults,
          { gate, passed: false, errors, testedAt: event.timestamp },
        ],
      },
    },
  };
}

function onPromotionApproved(
  projection: AuditProjection,
  event: ESAAEvent<PromotionApprovedPayload>
): AuditProjection {
  const { batchId, promotedFiles } = event.payload;
  const existing = projection.promotions[batchId];
  if (!existing) return projection;

  return {
    ...projection,
    promotions: {
      ...projection.promotions,
      [batchId]: {
        ...existing,
        outcome: "APPROVED",
        promotedFiles,
      },
    },
  };
}

function onPromotionRejected(
  projection: AuditProjection,
  event: ESAAEvent<PromotionRejectedPayload>
): AuditProjection {
  const { batchId, reason } = event.payload;
  const existing = projection.promotions[batchId];
  if (!existing) return projection;

  return {
    ...projection,
    promotions: {
      ...projection.promotions,
      [batchId]: { ...existing, outcome: "REJECTED", rollbackReason: reason },
    },
  };
}

function onPromotionRolledBack(
  projection: AuditProjection,
  event: ESAAEvent<PromotionRolledBackPayload>
): AuditProjection {
  const { batchId, reason } = event.payload;
  const existing = projection.promotions[batchId];
  if (!existing) return projection;

  return {
    ...projection,
    promotions: {
      ...projection.promotions,
      [batchId]: {
        ...existing,
        outcome: "ROLLED_BACK",
        rolledBackAt: event.timestamp,
        rollbackReason: reason,
      },
    },
  };
}

function onAgentQuarantined(
  projection: AuditProjection,
  event: ESAAEvent<AgentQuarantinedPayload>
): AuditProjection {
  const { agentId, reason, failureCount } = event.payload;

  const entry: AgentAuditEntry = {
    agentId,
    model: event.metadata.model ?? "unknown",
    event: "QUARANTINED",
    timestamp: event.timestamp,
    reason,
    failureCount,
  };

  return {
    ...projection,
    agents: [...projection.agents, entry],
  };
}

function onAgentReinstated(
  projection: AuditProjection,
  event: ESAAEvent<AgentReinstatedPayload>
): AuditProjection {
  const { agentId } = event.payload;

  const entry: AgentAuditEntry = {
    agentId,
    model: event.metadata.model ?? "unknown",
    event: "REINSTATED",
    timestamp: event.timestamp,
    reason: null,
    failureCount: 0,
  };

  return {
    ...projection,
    agents: [...projection.agents, entry],
  };
}
