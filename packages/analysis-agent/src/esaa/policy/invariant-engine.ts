/**
 * @fileoverview Invariant Engine do ESAA Hardened v2.
 *
 * Aplica invariantes do sistema que NUNCA podem ser violadas.
 * Diferente das políticas (que são configuráveis), invariantes são absolutas.
 *
 * @module esaa/policy/invariant-engine
 * @version 2.0.0
 */

import type { Intention } from "../types/intentions.js";
import type { OperationalProjection } from "../types/projections.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Resultado da verificação de invariantes. */
export interface InvariantCheckResult {
  /** true = todas as invariantes satisfeitas. */
  valid: boolean;
  /** Invariantes violadas (ID → mensagem). */
  violations: InvariantViolation[];
}

/** Violação de uma invariante. */
export interface InvariantViolation {
  invariantId: string;
  description: string;
  /** Dados adicionais para diagnóstico. */
  context: Record<string, string | number | boolean>;
}

// ─── InvariantEngine ──────────────────────────────────────────────────────────

/**
 * Verifica invariantes do sistema antes da execução de uma intenção.
 *
 * As invariantes aqui definidas são absolutas: uma violação resulta em
 * rejeição imediata, independente de políticas ou permissões.
 */
export class InvariantEngine {
  /**
   * Verifica todas as invariantes para uma intenção.
   *
   * @param intention   Intenção a verificar
   * @param projection  Estado atual do sistema
   */
  check(
    intention: Intention,
    projection: OperationalProjection
  ): InvariantCheckResult {
    const violations: InvariantViolation[] = [];

    // Executar todos os checks
    this.checkNoSelfQuarantine(intention, projection, violations);
    this.checkNoDuplicateFileGeneration(intention, projection, violations);
    this.checkNoExpiredIntention(intention, violations);
    this.checkWorkspaceLimitNotExceeded(projection, violations);
    this.checkAgentNotQuarantinedForExecution(intention, projection, violations);
    this.checkPromotionBatchUniqueness(intention, projection, violations);

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  // ─── Invariantes Individuais ─────────────────────────────────────────────

  /**
   * INV-001: Um agente não pode quarentenar a si mesmo.
   */
  private checkNoSelfQuarantine(
    intention: Intention,
    _projection: OperationalProjection,
    violations: InvariantViolation[]
  ): void {
    const payload = intention.payload as Record<string, unknown>;

    if (
      intention.type === "AUDIT_MANIFEST" &&
      payload["targetAgentId"] === intention.agentId
    ) {
      violations.push({
        invariantId: "INV-001",
        description: "Um agente não pode quarentenar a si mesmo",
        context: { agentId: intention.agentId },
      });
    }
  }

  /**
   * INV-002: Não pode haver duas intenções GENERATE_FILE para o mesmo path ativas.
   */
  private checkNoDuplicateFileGeneration(
    intention: Intention,
    projection: OperationalProjection,
    violations: InvariantViolation[]
  ): void {
    if (intention.type !== "GENERATE_FILE") return;

    const payload = intention.payload as { filePath?: string };
    if (!payload.filePath) return;

    const inProgress = projection.filesInProgress[payload.filePath];
    if (inProgress && inProgress !== intention.intentionId) {
      violations.push({
        invariantId: "INV-002",
        description: `Arquivo ${payload.filePath} já está sendo gerado pela intenção ${inProgress}`,
        context: {
          filePath: payload.filePath,
          existingIntentionId: inProgress,
        },
      });
    }
  }

  /**
   * INV-003: Intenção expirada não pode ser executada.
   */
  private checkNoExpiredIntention(
    intention: Intention,
    violations: InvariantViolation[]
  ): void {
    const now = Date.now();
    const expiresAt = new Date(intention.expiresAt).getTime();

    if (now > expiresAt) {
      violations.push({
        invariantId: "INV-003",
        description: `Intenção ${intention.intentionId} expirou em ${intention.expiresAt}`,
        context: {
          intentionId: intention.intentionId,
          expiresAt: intention.expiresAt,
          now: new Date(now).toISOString(),
          overdue: Math.floor((now - expiresAt) / 1000),
        },
      });
    }
  }

  /**
   * INV-004: Máximo de 5 workspaces efêmeros ativos simultaneamente.
   */
  private checkWorkspaceLimitNotExceeded(
    projection: OperationalProjection,
    violations: InvariantViolation[]
  ): void {
    const activeWorkspaceCount = Object.keys(projection.activeWorkspaces).length;

    if (activeWorkspaceCount >= 5) {
      violations.push({
        invariantId: "INV-004",
        description: `Limite de workspaces ativos atingido: ${activeWorkspaceCount}/5`,
        context: { activeWorkspaceCount, limit: 5 },
      });
    }
  }

  /**
   * INV-005: Agente quarentenado não pode propor execução de arquivo ou pipeline.
   */
  private checkAgentNotQuarantinedForExecution(
    intention: Intention,
    projection: OperationalProjection,
    violations: InvariantViolation[]
  ): void {
    const executionTypes: Intention["type"][] = [
      "GENERATE_FILE",
      "FULL_PIPELINE",
      "GENERATE_ARCHITECTURE",
    ];

    if (!executionTypes.includes(intention.type)) return;

    const agentState = projection.agents[intention.agentId];
    if (agentState?.status === "QUARANTINED") {
      violations.push({
        invariantId: "INV-005",
        description: `Agente ${intention.agentId} está quarentenado e não pode executar ${intention.type}`,
        context: {
          agentId: intention.agentId,
          quarantineReason: agentState.quarantineReason ?? "desconhecido",
          failureCount: agentState.failureCount,
        },
      });
    }
  }

  /**
   * INV-006: Não pode haver dois lotes de promoção com o mesmo intentionId ativos.
   */
  private checkPromotionBatchUniqueness(
    intention: Intention,
    projection: OperationalProjection,
    violations: InvariantViolation[]
  ): void {
    const existingPromotion = Object.values(projection.activePromotions).find(
      p =>
        p.intentionId === intention.intentionId &&
        p.status !== "APPROVED" &&
        p.status !== "ROLLED_BACK"
    );

    if (existingPromotion) {
      violations.push({
        invariantId: "INV-006",
        description: `Já existe um lote de promoção ativo para a intenção ${intention.intentionId}`,
        context: {
          intentionId: intention.intentionId,
          batchId: existingPromotion.batchId,
          status: existingPromotion.status,
        },
      });
    }
  }
}

/** Instância global do InvariantEngine. */
export const globalInvariantEngine = new InvariantEngine();
