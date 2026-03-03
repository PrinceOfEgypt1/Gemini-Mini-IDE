/**
 * @fileoverview Vocabulário completo de eventos do ESAA Hardened v2.
 *
 * Todos os eventos são imutáveis, append-only e carregam IDs de correlação
 * e causalidade para rastreabilidade end-to-end.
 *
 * @module esaa/types/events
 * @version 2.0.0
 */

// ─── Event Type Discriminant ─────────────────────────────────────────────────

/** Union exaustiva de todos os tipos de evento do sistema ESAA. */
export type ESAAEventType =
  | "INTENTION_PROPOSED"
  | "INTENTION_APPROVED"
  | "INTENTION_REJECTED"
  | "EXECUTION_STARTED"
  | "EXECUTION_SUCCEEDED"
  | "EXECUTION_FAILED"
  | "PROMOTION_REQUESTED"
  | "PROMOTION_GATE_PASSED"
  | "PROMOTION_GATE_FAILED"
  | "PROMOTION_APPROVED"
  | "PROMOTION_REJECTED"
  | "PROMOTION_ROLLED_BACK"
  | "ROLLBACK_REQUESTED"
  | "ROLLBACK_COMPLETED"
  | "SNAPSHOT_CREATED"
  | "AGENT_QUARANTINED"
  | "AGENT_REINSTATED"
  | "WORKSPACE_CREATED"
  | "WORKSPACE_DESTROYED"
  | "INVARIANT_VIOLATED"
  | "CONCURRENCY_CONFLICT";

// ─── Base Event Structure ────────────────────────────────────────────────────

/**
 * Metadados comuns a todos os eventos.
 * Separados do payload para facilitar indexação.
 */
export interface EventMetadata {
  /** ID do agente que originou o evento. */
  agentId: string;
  /** Modelo LLM usado (quando aplicável). */
  model?: string;
  /** Versão do schema de payload. */
  schemaVersion: string;
  /** Chave de idempotência – rejeita duplicatas com mesma chave+tipo. */
  idempotencyKey?: string;
  /** Hostname do processo que gerou o evento. */
  hostname?: string;
}

/**
 * Estrutura base de um evento ESAA.
 * O parâmetro de tipo `P` descreve o shape do payload.
 */
export interface ESAAEvent<P = unknown> {
  /** UUID v4 único do evento. */
  eventId: string;
  /** Agrupa eventos de um mesmo aggregate (ex: agentId, workspaceId). */
  streamId: string;
  /** Rastreia um fluxo completo ponta-a-ponta (ex: uma requisição /analyze). */
  correlationId: string;
  /** ID do evento que causou este (null para eventos raiz). */
  causationId: string | null;
  /** Tipo discriminante do evento. */
  type: ESAAEventType;
  /** ID do aggregate a que pertence (idêntico ou subset de streamId). */
  aggregateId: string;
  /** Número de sequência monotônico dentro do stream. */
  version: number;
  /** Timestamp ISO 8601 UTC. */
  timestamp: string;
  /** Payload específico do tipo de evento. */
  payload: P;
  /** Metadados de rastreabilidade. */
  metadata: EventMetadata;
}

// ─── Payload Types ───────────────────────────────────────────────────────────

/** Tipos de intenção que um agente pode propor. */
export type IntentionType =
  | "GENERATE_ANALYSIS"
  | "GENERATE_PRODUCT"
  | "GENERATE_ARCHITECTURE"
  | "GENERATE_USER_STORIES"
  | "GENERATE_FILE"
  | "AUDIT_MANIFEST"
  | "FULL_PIPELINE";

/** Nível de risco de uma intenção. */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Payload: INTENTION_PROPOSED */
export interface IntentionProposedPayload {
  intentionId: string;
  type: IntentionType;
  agentId: string;
  /** Hash SHA-256 da projeção operacional no momento da proposta. */
  baseProjectionHash: string;
  /** Hash SHA-256 dos arquivos que serão tocados (path → hash). */
  baseFileHashes: Record<string, string>;
  riskLevel: RiskLevel;
  /** Sumário legível do que será feito. */
  description: string;
}

/** Payload: INTENTION_APPROVED */
export interface IntentionApprovedPayload {
  intentionId: string;
  approvedBy: "POLICY_ENGINE" | "HUMAN";
  workspaceId?: string;
}

/** Payload: INTENTION_REJECTED */
export interface IntentionRejectedPayload {
  intentionId: string;
  rejectedBy: "POLICY_ENGINE" | "INVARIANT_ENGINE" | "CONCURRENCY_GUARD" | "HUMAN";
  reason: string;
  violatedInvariants?: string[];
}

/** Payload: EXECUTION_STARTED */
export interface ExecutionStartedPayload {
  intentionId: string;
  workspaceId: string;
  workspacePath: string;
  step: IntentionType;
}

/** Payload: EXECUTION_SUCCEEDED */
export interface ExecutionSucceededPayload {
  intentionId: string;
  workspaceId: string;
  /** Número de arquivos gerados nesta execução. */
  filesGenerated: number;
  /** Caminhos dos arquivos gerados. */
  filePaths: string[];
  durationMs: number;
}

/** Payload: EXECUTION_FAILED */
export interface ExecutionFailedPayload {
  intentionId: string;
  workspaceId: string;
  error: string;
  /** Stack trace sanitizado (sem PII). */
  stackTrace?: string;
  durationMs: number;
  /** Tentativa atual (1-based). */
  attempt: number;
  /** Máximo de tentativas configurado. */
  maxAttempts: number;
}

/** Payload: PROMOTION_REQUESTED */
export interface PromotionRequestedPayload {
  batchId: string;
  intentionId: string;
  workspaceId: string;
  workspacePath: string;
  filePaths: string[];
}

/** Nomes dos gates de promoção. */
export type PromotionGateName =
  | "SYNTAX_VALIDATION"
  | "COMPLETENESS_VALIDATION"
  | "STRUCTURE_AUDIT"
  | "INTEGRITY_CHECK"
  | "MANIFEST_VALIDATION";

/** Payload: PROMOTION_GATE_PASSED */
export interface PromotionGatePassedPayload {
  batchId: string;
  gate: PromotionGateName;
}

/** Payload: PROMOTION_GATE_FAILED */
export interface PromotionGateFailedPayload {
  batchId: string;
  gate: PromotionGateName;
  errors: string[];
}

/** Payload: PROMOTION_APPROVED */
export interface PromotionApprovedPayload {
  batchId: string;
  promotedFiles: string[];
  totalDurationMs: number;
}

/** Payload: PROMOTION_REJECTED */
export interface PromotionRejectedPayload {
  batchId: string;
  reason: string;
  failedGates: PromotionGateName[];
}

/** Payload: PROMOTION_ROLLED_BACK */
export interface PromotionRolledBackPayload {
  batchId: string;
  rolledBackFiles: string[];
  reason: string;
}

/** Payload: ROLLBACK_REQUESTED */
export interface RollbackRequestedPayload {
  targetSnapshotId?: string;
  targetCorrelationId?: string;
  requestedBy: string;
  reason: string;
}

/** Payload: ROLLBACK_COMPLETED */
export interface RollbackCompletedPayload {
  restoredSnapshotId: string;
  restoredVersion: number;
  filesRestored: number;
}

/** Payload: SNAPSHOT_CREATED */
export interface SnapshotCreatedPayload {
  snapshotId: string;
  aggregateId: string;
  version: number;
  /** Tamanho do estado serializado em bytes. */
  stateBytes: number;
}

/** Payload: AGENT_QUARANTINED */
export interface AgentQuarantinedPayload {
  agentId: string;
  reason: string;
  failureCount: number;
  /** ID do evento de execução que desencadeou a quarentena. */
  triggeringEventId: string;
}

/** Payload: AGENT_REINSTATED */
export interface AgentReinstatedPayload {
  agentId: string;
  reinstatedBy: string;
}

/** Payload: WORKSPACE_CREATED */
export interface WorkspaceCreatedPayload {
  workspaceId: string;
  workspacePath: string;
  intentionId: string;
}

/** Payload: WORKSPACE_DESTROYED */
export interface WorkspaceDestroyedPayload {
  workspaceId: string;
  workspacePath: string;
  reason: "PROMOTED" | "ROLLED_BACK" | "EXPIRED" | "ERROR";
}

/** Payload: INVARIANT_VIOLATED */
export interface InvariantViolatedPayload {
  invariantId: string;
  intentionId: string;
  description: string;
}

/** Payload: CONCURRENCY_CONFLICT */
export interface ConcurrencyConflictPayload {
  intentionId: string;
  expectedHash: string;
  actualHash: string;
  conflictingEventIds: string[];
}

// ─── Typed Event Constructors ─────────────────────────────────────────────────

/** Mapa de tipo → payload para type-safety em event handlers. */
export interface ESAAEventPayloadMap {
  INTENTION_PROPOSED: IntentionProposedPayload;
  INTENTION_APPROVED: IntentionApprovedPayload;
  INTENTION_REJECTED: IntentionRejectedPayload;
  EXECUTION_STARTED: ExecutionStartedPayload;
  EXECUTION_SUCCEEDED: ExecutionSucceededPayload;
  EXECUTION_FAILED: ExecutionFailedPayload;
  PROMOTION_REQUESTED: PromotionRequestedPayload;
  PROMOTION_GATE_PASSED: PromotionGatePassedPayload;
  PROMOTION_GATE_FAILED: PromotionGateFailedPayload;
  PROMOTION_APPROVED: PromotionApprovedPayload;
  PROMOTION_REJECTED: PromotionRejectedPayload;
  PROMOTION_ROLLED_BACK: PromotionRolledBackPayload;
  ROLLBACK_REQUESTED: RollbackRequestedPayload;
  ROLLBACK_COMPLETED: RollbackCompletedPayload;
  SNAPSHOT_CREATED: SnapshotCreatedPayload;
  AGENT_QUARANTINED: AgentQuarantinedPayload;
  AGENT_REINSTATED: AgentReinstatedPayload;
  WORKSPACE_CREATED: WorkspaceCreatedPayload;
  WORKSPACE_DESTROYED: WorkspaceDestroyedPayload;
  INVARIANT_VIOLATED: InvariantViolatedPayload;
  CONCURRENCY_CONFLICT: ConcurrencyConflictPayload;
}

/** Evento tipado: o payload é inferido do tipo discriminante. */
export type TypedESAAEvent<T extends ESAAEventType> = ESAAEvent<ESAAEventPayloadMap[T]>;
