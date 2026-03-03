/**
 * @fileoverview Tipos para o Intention Gateway e Concurrency Guard do ESAA v2.
 *
 * Uma Intention é a unidade atômica de proposta de trabalho: um agente declara
 * O QUE pretende fazer (não O QUE fez). O sistema decide se pode executar.
 *
 * @module esaa/types/intentions
 * @version 2.0.0
 */

import type { IntentionType, RiskLevel } from "./events.js";

// ─── Intention Lifecycle States ───────────────────────────────────────────────

/** Estados possíveis de uma intenção. */
export type IntentionStatus =
  | "PENDING"    // Proposta, aguardando validação
  | "APPROVED"   // Aprovada, pronta para execução
  | "REJECTED"   // Rejeitada pelo policy/invariant engine
  | "EXECUTING"  // Em execução no workspace
  | "SUCCEEDED"  // Execução concluída com sucesso
  | "FAILED"     // Execução falhou
  | "EXPIRED";   // TTL expirou antes da execução

// ─── Core Intention Types ─────────────────────────────────────────────────────

/**
 * Representa a proposta de uma ação que um agente quer executar.
 * O payload genérico descreve os parâmetros da intenção.
 */
export interface Intention<P = unknown> {
  /** UUID v4 único da intenção. */
  intentionId: string;
  /** ID do agente que propõe a intenção. */
  agentId: string;
  /** Rastreamento end-to-end (compartilhado com outros eventos do mesmo fluxo). */
  correlationId: string;
  /** Tipo de operação pretendida. */
  type: IntentionType;
  /** Parâmetros da operação. */
  payload: P;
  /** Estado atual da intenção. */
  status: IntentionStatus;
  /**
   * Hash SHA-256 da projeção operacional no momento da proposta.
   * Usado pelo Concurrency Guard para detectar mudanças concorrentes.
   */
  baseProjectionHash: string;
  /**
   * Hash SHA-256 de cada arquivo que esta intenção pretende tocar.
   * Chave = path relativo, valor = hash do conteúdo atual.
   */
  baseFileHashes: Record<string, string>;
  /** Nível de risco classificado pelo Policy Engine. */
  riskLevel: RiskLevel;
  /** Descrição legível do que será feito. */
  description: string;
  /** Timestamp de criação ISO 8601. */
  createdAt: string;
  /** Timestamp de expiração ISO 8601. */
  expiresAt: string;
  /** Tempo de vida em milissegundos (default: 5 minutos). */
  ttlMs: number;
}

/**
 * Intenção aprovada pelo Policy Engine.
 * Pronta para execução no workspace efêmero.
 */
export interface ApprovedIntention<P = unknown> extends Intention<P> {
  status: "APPROVED";
  /** Quem aprovou: engine automático ou humano. */
  approvedBy: "POLICY_ENGINE" | "HUMAN";
  /** Timestamp de aprovação. */
  approvedAt: string;
  /** ID do workspace efêmero criado para esta intenção (se aplicável). */
  workspaceId?: string;
}

/**
 * Intenção rejeitada.
 */
export interface RejectedIntention<P = unknown> extends Intention<P> {
  status: "REJECTED";
  rejectedBy: "POLICY_ENGINE" | "INVARIANT_ENGINE" | "CONCURRENCY_GUARD" | "HUMAN";
  rejectionReason: string;
  violatedInvariants: string[];
  rejectedAt: string;
}

// ─── Concurrency Guard ───────────────────────────────────────────────────────

/**
 * Resultado da verificação de concorrência antes da execução.
 */
export interface ConcurrencyCheckResult {
  /** true = pode prosseguir; false = conflito detectado. */
  safe: boolean;
  /** Hash atual da projeção (pode diferir de baseProjectionHash). */
  currentProjectionHash: string;
  /** Arquivos que foram modificados desde baseProjectionHash. */
  conflictingFiles: string[];
  /** IDs dos eventos que causaram os conflitos. */
  conflictingEventIds: string[];
}

// ─── Payloads de Intentions específicas ──────────────────────────────────────

/** Payload para GENERATE_ANALYSIS */
export interface GenerateAnalysisPayload {
  userPrompt: string;
  maxLen?: number;
}

/** Payload para GENERATE_PRODUCT */
export interface GenerateProductPayload {
  userPrompt: string;
  analysisCorrelationId: string;
}

/** Payload para GENERATE_ARCHITECTURE */
export interface GenerateArchitecturePayload {
  userPrompt: string;
  productCorrelationId: string;
}

/** Payload para GENERATE_USER_STORIES */
export interface GenerateUserStoriesPayload {
  epicIds: string[];
  architectureCorrelationId: string;
}

/** Payload para GENERATE_FILE */
export interface GenerateFilePayload {
  filePath: string;
  purpose: string;
  criticality: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  architectureCorrelationId: string;
}

/** Payload para AUDIT_MANIFEST */
export interface AuditManifestPayload {
  manifestSize: number;
  userPrompt: string;
  architectureCorrelationId: string;
}

/** Payload para FULL_PIPELINE */
export interface FullPipelinePayload {
  userPrompt: string;
  maxLen?: number;
  options?: {
    dryRun?: boolean;
    maxFiles?: number;
  };
}

/** Mapa de tipo → payload para type-safety nas intenções. */
export interface IntentionPayloadMap {
  GENERATE_ANALYSIS: GenerateAnalysisPayload;
  GENERATE_PRODUCT: GenerateProductPayload;
  GENERATE_ARCHITECTURE: GenerateArchitecturePayload;
  GENERATE_USER_STORIES: GenerateUserStoriesPayload;
  GENERATE_FILE: GenerateFilePayload;
  AUDIT_MANIFEST: AuditManifestPayload;
  FULL_PIPELINE: FullPipelinePayload;
}

/** Intenção fortemente tipada: o payload é inferido do tipo. */
export type TypedIntention<T extends IntentionType> = Intention<IntentionPayloadMap[T]>;
