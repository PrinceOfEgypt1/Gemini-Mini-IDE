/**
 * @fileoverview Tipos para as projeções operacional e de auditoria do ESAA v2.
 *
 * O sistema mantém DUAS projeções independentes:
 * - Operacional: estado atual para tomada de decisão dos agentes
 * - Auditoria: histórico completo para observabilidade e replay
 *
 * @module esaa/types/projections
 * @version 2.0.0
 */

import type { IntentionStatus } from "./intentions.js";
import type { RiskLevel, PromotionGateName, IntentionType } from "./events.js";

// ─── Projeção Operacional ────────────────────────────────────────────────────

/**
 * Estado de um agente registrado no sistema.
 */
export interface AgentState {
  agentId: string;
  model: string;
  status: "ACTIVE" | "QUARANTINED";
  failureCount: number;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  quarantinedAt: string | null;
  quarantineReason: string | null;
  registeredAt: string;
}

/**
 * Estado de uma intenção ativa (em progresso).
 */
export interface ActiveIntentionState {
  intentionId: string;
  correlationId: string;
  agentId: string;
  type: IntentionType;
  status: IntentionStatus;
  riskLevel: RiskLevel;
  workspaceId: string | null;
  startedAt: string;
  expiresAt: string;
}

/**
 * Estado de um workspace efêmero ativo.
 */
export interface ActiveWorkspaceState {
  workspaceId: string;
  intentionId: string;
  workspacePath: string;
  createdAt: string;
  /** Arquivos pendentes de promoção. */
  pendingFiles: string[];
}

/**
 * Estado de um lote de promoção em progresso.
 */
export interface ActivePromotionState {
  batchId: string;
  intentionId: string;
  workspaceId: string;
  status: "PENDING" | "RUNNING_GATES" | "APPROVED" | "REJECTED" | "ROLLED_BACK";
  gatesPassed: PromotionGateName[];
  gatesFailed: PromotionGateName[];
  requestedAt: string;
  promotedAt: string | null;
}

/**
 * Projeção operacional completa.
 *
 * Esta é a visão "ao vivo" do sistema: agentes, intenções ativas,
 * workspaces e promoções em andamento.
 *
 * O hash SHA-256 desta estrutura serializada é o "baseProjectionHash"
 * usado pelo Concurrency Guard.
 */
export interface OperationalProjection {
  /** Versão do evento mais recente aplicado a esta projeção. */
  lastAppliedVersion: number;
  /** Timestamp da última atualização. */
  updatedAt: string;
  /** Registro de agentes (agentId → estado). */
  agents: Record<string, AgentState>;
  /** Intenções ativas (intentionId → estado). */
  activeIntentions: Record<string, ActiveIntentionState>;
  /** Workspaces efêmeros ativos (workspaceId → estado). */
  activeWorkspaces: Record<string, ActiveWorkspaceState>;
  /** Lotes de promoção ativos (batchId → estado). */
  activePromotions: Record<string, ActivePromotionState>;
  /** Caminhos de arquivos em geração (path → intentionId). */
  filesInProgress: Record<string, string>;
  /**
   * Hash SHA-256 desta projeção (excluindo o próprio campo hash).
   * Calculado e atualizado após cada mutação.
   */
  hash: string;
}

// ─── Projeção de Auditoria ───────────────────────────────────────────────────

/**
 * Entrada no log de auditoria de uma intenção.
 */
export interface IntentionAuditEntry {
  intentionId: string;
  correlationId: string;
  agentId: string;
  type: IntentionType;
  riskLevel: RiskLevel;
  proposedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  executionStartedAt: string | null;
  executionEndedAt: string | null;
  outcome: "PENDING" | "SUCCEEDED" | "FAILED" | "REJECTED" | "EXPIRED";
  failureReason: string | null;
  filesGenerated: string[];
  durationMs: number | null;
}

/**
 * Entrada no log de auditoria de uma promoção.
 */
export interface PromotionAuditEntry {
  batchId: string;
  correlationId: string;
  intentionId: string;
  requestedAt: string;
  outcome: "APPROVED" | "REJECTED" | "ROLLED_BACK";
  gateResults: Array<{
    gate: PromotionGateName;
    passed: boolean;
    errors: string[];
    testedAt: string;
  }>;
  promotedFiles: string[];
  rolledBackAt: string | null;
  rollbackReason: string | null;
}

/**
 * Entrada no log de auditoria de um agente.
 */
export interface AgentAuditEntry {
  agentId: string;
  model: string;
  event: "REGISTERED" | "QUARANTINED" | "REINSTATED";
  timestamp: string;
  reason: string | null;
  failureCount: number;
}

/**
 * Projeção de auditoria completa.
 *
 * Histórico imutável para observabilidade, debugging e compliance.
 * Nunca apaga entradas; só adiciona.
 */
export interface AuditProjection {
  /** Versão do evento mais recente aplicado. */
  lastAppliedVersion: number;
  /** Timestamp da última atualização. */
  updatedAt: string;
  /** Histórico de intenções (intentionId → entrada). */
  intentions: Record<string, IntentionAuditEntry>;
  /** Histórico de promoções (batchId → entrada). */
  promotions: Record<string, PromotionAuditEntry>;
  /** Histórico de agentes (agentId_timestamp → entrada). */
  agents: AgentAuditEntry[];
  /**
   * Índice de correlação: correlationId → [intentionIds].
   * Facilita a reconstrução de um fluxo completo.
   */
  correlationIndex: Record<string, string[]>;
}

// ─── Snapshot ────────────────────────────────────────────────────────────────

/**
 * Snapshot point-in-time de uma projeção.
 * Usado pelo Recovery Controller para rollback rápido.
 */
export interface ProjectionSnapshot {
  snapshotId: string;
  aggregateId: string;
  /** "operational" | "audit" */
  projectionType: "operational" | "audit";
  /** Versão do último evento aplicado quando o snapshot foi criado. */
  version: number;
  /** Timestamp de criação. */
  createdAt: string;
  /** Estado serializado (JSON string). */
  state: string;
  /** SHA-256 do state para validação de integridade. */
  stateHash: string;
}
