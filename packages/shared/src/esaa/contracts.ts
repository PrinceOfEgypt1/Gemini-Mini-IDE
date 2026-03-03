/**
 * @fileoverview Contratos HTTP da API ESAA Hardened v2.
 *
 * Define os shapes de request/response para todos os endpoints ESAA.
 * Compartilhado entre server e clientes.
 *
 * @module shared/esaa/contracts
 * @version 2.0.0
 */

// ─── Health ───────────────────────────────────────────────────────────────────

/** Response: GET /esaa/health */
export interface ESAAHealthResponse {
  enabled: boolean;
  dbPath: string;
  streamVersion: number;
  operational: {
    activeAgents: number;
    quarantinedAgents: number;
    activeIntentions: number;
    activeWorkspaces: number;
    activePromotions: number;
    projectionHash: string;
  };
  uptime: number;
}

// ─── Events ───────────────────────────────────────────────────────────────────

/** Request: GET /esaa/events (query params) */
export interface ESAAEventsQueryParams {
  streamId?: string;
  correlationId?: string;
  type?: string;
  sinceVersion?: number;
  limit?: number;
}

/** Response: GET /esaa/events */
export interface ESAAEventsResponse {
  events: ESAAEventDTO[];
  total: number;
}

/** DTO de evento para a API (payload e metadata como string JSON). */
export interface ESAAEventDTO {
  eventId: string;
  streamId: string;
  correlationId: string;
  causationId: string | null;
  type: string;
  aggregateId: string;
  version: number;
  timestamp: string;
  payload: unknown;
  metadata: {
    agentId: string;
    model?: string;
    schemaVersion: string;
  };
}

// ─── Projections ──────────────────────────────────────────────────────────────

/** Response: GET /esaa/projections/operational */
export interface ESAAOperationalProjectionResponse {
  lastAppliedVersion: number;
  updatedAt: string;
  hash: string;
  activeAgents: number;
  quarantinedAgents: number;
  activeIntentions: number;
  activeWorkspaces: number;
  activePromotions: number;
  filesInProgress: number;
}

/** Response: GET /esaa/projections/audit/:correlationId */
export interface ESAAAuditTrailResponse {
  correlationId: string;
  intentions: Array<{
    intentionId: string;
    type: string;
    agentId: string;
    riskLevel: string;
    proposedAt: string;
    outcome: string;
    filesGenerated: number;
    durationMs: number | null;
  }>;
  promotions: Array<{
    batchId: string;
    requestedAt: string;
    outcome: string;
    gateResults: Array<{
      gate: string;
      passed: boolean;
      errors: string[];
    }>;
    promotedFiles: number;
  }>;
}

// ─── Intentions ───────────────────────────────────────────────────────────────

/** Request: POST /esaa/intentions */
export interface ESAAProposeIntentionRequest {
  agentId: string;
  type: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  baseProjectionHash?: string;
  baseFileHashes?: Record<string, string>;
  ttlMs?: number;
}

/** Response: POST /esaa/intentions */
export interface ESAAProposeIntentionResponse {
  outcome: "approved" | "rejected";
  intentionId: string;
  correlationId: string;
  riskLevel: string;
  reasons?: string[];
}

// ─── Promotions ───────────────────────────────────────────────────────────────

/** Response: GET /esaa/promotions/:batchId */
export interface ESAAPromotionResponse {
  batchId: string;
  correlationId: string;
  intentionId: string;
  status: string;
  gateResults: Array<{
    gate: string;
    passed: boolean;
    errors: string[];
    testedAt: string;
  }>;
  promotedFiles: string[];
  createdAt: string;
  promotedAt: string | null;
  rolledBackAt: string | null;
  rollbackReason: string | null;
}

/** Request: POST /esaa/promotions/:batchId/rollback */
export interface ESAAPromotionRollbackRequest {
  reason: string;
  operatorId: string;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

/** DTO de agente. */
export interface ESAAAgentDTO {
  agentId: string;
  model: string;
  status: "active" | "quarantined";
  failureCount: number;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  quarantinedAt: string | null;
  quarantineReason: string | null;
  createdAt: string;
}

/** Response: GET /esaa/agents */
export interface ESAAAgentsResponse {
  agents: ESAAAgentDTO[];
  total: number;
  active: number;
  quarantined: number;
}

/** Request: POST /esaa/agents/:agentId/quarantine */
export interface ESAAQuarantineRequest {
  reason: string;
  operatorId: string;
  triggeringEventId?: string;
}

/** Request: POST /esaa/agents/:agentId/reinstate */
export interface ESAAReinstateRequest {
  operatorId: string;
}

// ─── Recovery ─────────────────────────────────────────────────────────────────

/** Response: POST /esaa/recovery/snapshot */
export interface ESAASnapshotResponse {
  operationalSnapshotId: string;
  auditSnapshotId: string;
  createdAt: string;
}

/** Request: POST /esaa/recovery/rollback */
export interface ESAARecoveryRollbackRequest {
  snapshotId?: string;
  correlationId?: string;
  operatorId: string;
}

/** Response: POST /esaa/recovery/replay */
export interface ESAAReplayResponse {
  success: boolean;
  operation: string;
  description: string;
  details: Record<string, string | number | boolean>;
}

/** Request: POST /esaa/recovery/replay */
export interface ESAAReplayRequest {
  full?: boolean;
  fromVersion?: number;
  operatorId: string;
}
