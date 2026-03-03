/**
 * @fileoverview Projeção Operacional do ESAA Hardened v2.
 *
 * Mantém o estado "ao vivo" do sistema: agentes, intenções ativas,
 * workspaces e promoções em andamento.
 *
 * O hash SHA-256 desta projeção é a base do Concurrency Guard.
 *
 * @module esaa/projections/operational-projection
 * @version 2.0.0
 */

import { createHash } from "node:crypto";
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
  PromotionApprovedPayload,
  PromotionRolledBackPayload,
  AgentQuarantinedPayload,
  AgentReinstatedPayload,
  WorkspaceCreatedPayload,
  WorkspaceDestroyedPayload,
} from "../types/events.js";
import type {
  OperationalProjection,
  AgentState,
  ActiveIntentionState,
  ActiveWorkspaceState,
  ActivePromotionState,
} from "../types/projections.js";

// ─── Estado Inicial ──────────────────────────────────────────────────────────

/**
 * Estado inicial vazio da projeção operacional.
 */
export function createEmptyOperationalProjection(): OperationalProjection {
  const projection: Omit<OperationalProjection, "hash"> = {
    lastAppliedVersion: 0,
    updatedAt: new Date().toISOString(),
    agents: {},
    activeIntentions: {},
    activeWorkspaces: {},
    activePromotions: {},
    filesInProgress: {},
  };

  return {
    ...projection,
    hash: computeProjectionHash(projection),
  };
}

// ─── Aplicação de Eventos ────────────────────────────────────────────────────

/**
 * Aplica um evento à projeção operacional, retornando uma nova projeção.
 *
 * Esta função é PURA: não modifica a projeção original.
 * O hash é recalculado após cada aplicação.
 */
export function applyEventToOperational(
  projection: OperationalProjection,
  event: ESAAEvent
): OperationalProjection {
  const updated = applyEventMutation(projection, event);

  return {
    ...updated,
    lastAppliedVersion: event.version,
    updatedAt: event.timestamp,
    hash: computeProjectionHash(updated),
  };
}

/**
 * Aplica uma sequência de eventos à projeção, em ordem.
 * Útil para replay completo.
 */
export function replayEventsToOperational(
  events: ESAAEvent[],
  initial?: OperationalProjection
): OperationalProjection {
  const base = initial ?? createEmptyOperationalProjection();
  return events.reduce(
    (proj, event) => applyEventToOperational(proj, event),
    base
  );
}

// ─── Mutadores por Tipo de Evento ────────────────────────────────────────────

function applyEventMutation(
  projection: OperationalProjection,
  event: ESAAEvent
): OperationalProjection {
  switch (event.type as ESAAEventType) {
    case "INTENTION_PROPOSED":
      return applyIntentionProposed(projection, event as ESAAEvent<IntentionProposedPayload>);

    case "INTENTION_APPROVED":
      return applyIntentionApproved(projection, event as ESAAEvent<IntentionApprovedPayload>);

    case "INTENTION_REJECTED":
      return applyIntentionRejected(projection, event as ESAAEvent<IntentionRejectedPayload>);

    case "EXECUTION_STARTED":
      return applyExecutionStarted(projection, event as ESAAEvent<ExecutionStartedPayload>);

    case "EXECUTION_SUCCEEDED":
      return applyExecutionSucceeded(projection, event as ESAAEvent<ExecutionSucceededPayload>);

    case "EXECUTION_FAILED":
      return applyExecutionFailed(projection, event as ESAAEvent<ExecutionFailedPayload>);

    case "PROMOTION_REQUESTED":
      return applyPromotionRequested(projection, event as ESAAEvent<PromotionRequestedPayload>);

    case "PROMOTION_APPROVED":
      return applyPromotionApproved(projection, event as ESAAEvent<PromotionApprovedPayload>);

    case "PROMOTION_REJECTED":
    case "PROMOTION_ROLLED_BACK":
      return applyPromotionRolledBack(projection, event as ESAAEvent<PromotionRolledBackPayload>);

    case "AGENT_QUARANTINED":
      return applyAgentQuarantined(projection, event as ESAAEvent<AgentQuarantinedPayload>);

    case "AGENT_REINSTATED":
      return applyAgentReinstated(projection, event as ESAAEvent<AgentReinstatedPayload>);

    case "WORKSPACE_CREATED":
      return applyWorkspaceCreated(projection, event as ESAAEvent<WorkspaceCreatedPayload>);

    case "WORKSPACE_DESTROYED":
      return applyWorkspaceDestroyed(projection, event as ESAAEvent<WorkspaceDestroyedPayload>);

    // Eventos de promoção por gate não alteram o estado operacional
    case "PROMOTION_GATE_PASSED":
    case "PROMOTION_GATE_FAILED":
    case "ROLLBACK_REQUESTED":
    case "ROLLBACK_COMPLETED":
    case "SNAPSHOT_CREATED":
    case "INVARIANT_VIOLATED":
    case "CONCURRENCY_CONFLICT":
      return projection;

    default:
      return projection;
  }
}

function applyIntentionProposed(
  projection: OperationalProjection,
  event: ESAAEvent<IntentionProposedPayload>
): OperationalProjection {
  const { intentionId, type, agentId, riskLevel } = event.payload;

  const intentionState: ActiveIntentionState = {
    intentionId,
    correlationId: event.correlationId,
    agentId,
    type,
    status: "PENDING",
    riskLevel,
    workspaceId: null,
    startedAt: event.timestamp,
    expiresAt: new Date(
      new Date(event.timestamp).getTime() + 5 * 60 * 1000
    ).toISOString(),
  };

  // Registrar agente se novo
  const existingAgent = projection.agents[agentId];
  const agentUpdate: Record<string, AgentState> = existingAgent
    ? {}
    : {
        [agentId]: {
          agentId,
          model: event.metadata.model ?? "unknown",
          status: "ACTIVE",
          failureCount: 0,
          consecutiveFailures: 0,
          lastFailureAt: null,
          quarantinedAt: null,
          quarantineReason: null,
          registeredAt: event.timestamp,
        },
      };

  return {
    ...projection,
    agents: { ...projection.agents, ...agentUpdate },
    activeIntentions: {
      ...projection.activeIntentions,
      [intentionId]: intentionState,
    },
  };
}

function applyIntentionApproved(
  projection: OperationalProjection,
  event: ESAAEvent<IntentionApprovedPayload>
): OperationalProjection {
  const { intentionId, workspaceId } = event.payload;
  const existing = projection.activeIntentions[intentionId];
  if (!existing) return projection;

  return {
    ...projection,
    activeIntentions: {
      ...projection.activeIntentions,
      [intentionId]: {
        ...existing,
        status: "APPROVED",
        workspaceId: workspaceId ?? null,
      },
    },
  };
}

function applyIntentionRejected(
  projection: OperationalProjection,
  event: ESAAEvent<IntentionRejectedPayload>
): OperationalProjection {
  const { intentionId } = event.payload;
  const { [intentionId]: _removed, ...rest } = projection.activeIntentions;

  return {
    ...projection,
    activeIntentions: rest,
  };
}

function applyExecutionStarted(
  projection: OperationalProjection,
  event: ESAAEvent<ExecutionStartedPayload>
): OperationalProjection {
  const { intentionId } = event.payload;
  const existing = projection.activeIntentions[intentionId];
  if (!existing) return projection;

  return {
    ...projection,
    activeIntentions: {
      ...projection.activeIntentions,
      [intentionId]: { ...existing, status: "EXECUTING" },
    },
  };
}

function applyExecutionSucceeded(
  projection: OperationalProjection,
  event: ESAAEvent<ExecutionSucceededPayload>
): OperationalProjection {
  const { intentionId, filePaths } = event.payload;
  const { [intentionId]: existing, ...restIntentions } = projection.activeIntentions;

  if (!existing) return projection;

  // Remover arquivos em progresso que foram gerados
  const updatedFilesInProgress = { ...projection.filesInProgress };
  for (const path of filePaths) {
    delete updatedFilesInProgress[path];
  }

  return {
    ...projection,
    activeIntentions: {
      ...restIntentions,
      [intentionId]: { ...existing, status: "SUCCEEDED" },
    },
    filesInProgress: updatedFilesInProgress,
  };
}

function applyExecutionFailed(
  projection: OperationalProjection,
  event: ESAAEvent<ExecutionFailedPayload>
): OperationalProjection {
  const { intentionId, attempt, maxAttempts } = event.payload;
  const existing = projection.activeIntentions[intentionId];
  if (!existing) return projection;

  // Se esgotou tentativas, incrementar contador de falhas do agente
  const isFinalFailure = attempt >= maxAttempts;
  const agentUpdate = isFinalFailure
    ? updateAgentFailure(projection.agents, existing.agentId, event.timestamp)
    : projection.agents;

  const newStatus = isFinalFailure ? "FAILED" : "APPROVED";

  return {
    ...projection,
    agents: agentUpdate,
    activeIntentions: {
      ...projection.activeIntentions,
      [intentionId]: { ...existing, status: newStatus },
    },
  };
}

function applyPromotionRequested(
  projection: OperationalProjection,
  event: ESAAEvent<PromotionRequestedPayload>
): OperationalProjection {
  const { batchId, intentionId, workspaceId } = event.payload;

  const promotionState: ActivePromotionState = {
    batchId,
    intentionId,
    workspaceId,
    status: "PENDING",
    gatesPassed: [],
    gatesFailed: [],
    requestedAt: event.timestamp,
    promotedAt: null,
  };

  return {
    ...projection,
    activePromotions: {
      ...projection.activePromotions,
      [batchId]: promotionState,
    },
  };
}

function applyPromotionApproved(
  projection: OperationalProjection,
  event: ESAAEvent<PromotionApprovedPayload>
): OperationalProjection {
  const { batchId } = event.payload;
  const { [batchId]: _removed, ...restPromotions } = projection.activePromotions;

  return {
    ...projection,
    activePromotions: restPromotions,
  };
}

function applyPromotionRolledBack(
  projection: OperationalProjection,
  event: ESAAEvent<PromotionRolledBackPayload>
): OperationalProjection {
  const { batchId } = event.payload;
  const { [batchId]: _removed, ...restPromotions } = projection.activePromotions;

  return {
    ...projection,
    activePromotions: restPromotions,
  };
}

function applyAgentQuarantined(
  projection: OperationalProjection,
  event: ESAAEvent<AgentQuarantinedPayload>
): OperationalProjection {
  const { agentId, reason, failureCount } = event.payload;
  const existing = projection.agents[agentId];

  const agentState: AgentState = {
    ...(existing ?? {
      agentId,
      model: event.metadata.model ?? "unknown",
      consecutiveFailures: 0,
      lastFailureAt: null,
      registeredAt: event.timestamp,
    }),
    agentId,
    status: "QUARANTINED",
    failureCount,
    quarantinedAt: event.timestamp,
    quarantineReason: reason,
  };

  return {
    ...projection,
    agents: { ...projection.agents, [agentId]: agentState },
  };
}

function applyAgentReinstated(
  projection: OperationalProjection,
  event: ESAAEvent<AgentReinstatedPayload>
): OperationalProjection {
  const { agentId } = event.payload;
  const existing = projection.agents[agentId];
  if (!existing) return projection;

  return {
    ...projection,
    agents: {
      ...projection.agents,
      [agentId]: {
        ...existing,
        status: "ACTIVE",
        quarantinedAt: null,
        quarantineReason: null,
        consecutiveFailures: 0,
      },
    },
  };
}

function applyWorkspaceCreated(
  projection: OperationalProjection,
  event: ESAAEvent<WorkspaceCreatedPayload>
): OperationalProjection {
  const { workspaceId, workspacePath, intentionId } = event.payload;

  const workspaceState: ActiveWorkspaceState = {
    workspaceId,
    intentionId,
    workspacePath,
    createdAt: event.timestamp,
    pendingFiles: [],
  };

  return {
    ...projection,
    activeWorkspaces: {
      ...projection.activeWorkspaces,
      [workspaceId]: workspaceState,
    },
  };
}

function applyWorkspaceDestroyed(
  projection: OperationalProjection,
  event: ESAAEvent<WorkspaceDestroyedPayload>
): OperationalProjection {
  const { workspaceId } = event.payload;
  const { [workspaceId]: _removed, ...rest } = projection.activeWorkspaces;

  return {
    ...projection,
    activeWorkspaces: rest,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function updateAgentFailure(
  agents: Record<string, AgentState>,
  agentId: string,
  timestamp: string
): Record<string, AgentState> {
  const existing = agents[agentId];
  if (!existing) return agents;

  return {
    ...agents,
    [agentId]: {
      ...existing,
      failureCount: existing.failureCount + 1,
      consecutiveFailures: existing.consecutiveFailures + 1,
      lastFailureAt: timestamp,
    },
  };
}

/**
 * Calcula o hash SHA-256 do estado da projeção (excluindo o campo `hash`).
 * Usado pelo Concurrency Guard.
 */
export function computeProjectionHash(
  projection: Omit<OperationalProjection, "hash">
): string {
  const normalized = JSON.stringify({
    lastAppliedVersion: projection.lastAppliedVersion,
    agents: projection.agents,
    activeIntentions: projection.activeIntentions,
    activeWorkspaces: projection.activeWorkspaces,
    activePromotions: projection.activePromotions,
    filesInProgress: projection.filesInProgress,
  });

  return createHash("sha256").update(normalized).digest("hex");
}
