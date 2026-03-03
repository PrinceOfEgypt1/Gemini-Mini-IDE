/**
 * @fileoverview Intention Gateway do ESAA Hardened v2.
 *
 * Ponto central de entrada para todas as intenções de agentes.
 * Nenhuma execução ocorre sem passar por este gateway.
 *
 * Fluxo:
 *   propose() → policy check → invariant check → concurrency check
 *               → APPROVED / REJECTED
 *
 * @module esaa/gateway/intention-gateway
 * @version 2.0.0
 */

import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { EventStore } from "../store/event-store.js";
import type { ProjectionEngine } from "../projections/projection-engine.js";
import type { PolicyEngine } from "../policy/policy-engine.js";
import type { InvariantEngine } from "../policy/invariant-engine.js";
import { PIPELINE_STREAM_ID } from "../projections/projection-engine.js";
import type {
  Intention,
  ApprovedIntention,
  RejectedIntention,
  ConcurrencyCheckResult,
  IntentionPayloadMap,
} from "../types/intentions.js";
import type {
  IntentionType,
  RiskLevel,
} from "../types/events.js";

// ─── Tipos Internos ────────────────────────────────────────────────────────────

/** Resultado completo da proposta de uma intenção. */
export type ProposeResult<P> =
  | { outcome: "approved"; intention: ApprovedIntention<P> }
  | { outcome: "rejected"; intention: RejectedIntention<P>; reasons: string[] };

/** Opções para proposta de intenção. */
export interface ProposeOptions {
  correlationId?: string;
  causationId?: string | null;
  ttlMs?: number;
  /** Hash da projeção que o agente está assumindo. Se diferir, conflito de concorrência. */
  baseProjectionHash?: string;
  /** Hashes dos arquivos que serão tocados. */
  baseFileHashes?: Record<string, string>;
}

// ─── IntentionGateway ─────────────────────────────────────────────────────────

/**
 * Gateway central para todas as intenções do sistema ESAA.
 */
export class IntentionGateway {
  constructor(
    private readonly store: EventStore,
    private readonly projections: ProjectionEngine,
    private readonly policy: PolicyEngine,
    private readonly invariants: InvariantEngine
  ) {}

  // ─── Proposta ──────────────────────────────────────────────────────────────

  /**
   * Propõe uma nova intenção.
   *
   * Este é o único ponto de entrada para criar intenções no sistema.
   * A intenção é avaliada, e o resultado é APPROVED ou REJECTED.
   *
   * @param agentId   ID do agente que propõe
   * @param type      Tipo de operação pretendida
   * @param payload   Parâmetros da operação
   * @param opts      Opções adicionais (correlationId, TTL, etc.)
   */
  async propose<T extends IntentionType>(
    agentId: string,
    type: T,
    payload: IntentionPayloadMap[T],
    opts: ProposeOptions = {}
  ): Promise<ProposeResult<IntentionPayloadMap[T]>> {
    const {
      correlationId = randomUUID(),
      causationId = null,
      ttlMs = 5 * 60 * 1000,
    } = opts;

    const now = new Date().toISOString();
    const intentionId = randomUUID();

    // Capturar hash atual da projeção operacional
    const currentProjectionHash = this.projections.getOperationalHash();
    const projection = this.projections.getOperational();

    // Verificar concorrência se o agente forneceu um baseProjectionHash
    if (opts.baseProjectionHash && opts.baseProjectionHash !== currentProjectionHash) {
      const concurrencyResult = this.checkConcurrency(
        opts.baseProjectionHash,
        currentProjectionHash,
        opts.baseFileHashes ?? {}
      );

      if (!concurrencyResult.safe) {
        // Emitir evento de conflito
        this.store.append(
          PIPELINE_STREAM_ID,
          agentId,
          "CONCURRENCY_CONFLICT",
          {
            intentionId,
            expectedHash: opts.baseProjectionHash,
            actualHash: currentProjectionHash,
            conflictingEventIds: concurrencyResult.conflictingEventIds,
          },
          { agentId, schemaVersion: "2.0.0" },
          { correlationId, causationId }
        );

        const rejected = this.buildRejectedIntention(
          intentionId,
          agentId,
          correlationId,
          type,
          payload as IntentionPayloadMap[T],
          currentProjectionHash,
          opts.baseFileHashes ?? {},
          "CONCURRENCY_GUARD",
          `Conflito de concorrência: projeção mudou desde baseProjectionHash fornecido. ` +
            `Arquivos conflitantes: ${concurrencyResult.conflictingFiles.join(", ")}`,
          [],
          now,
          ttlMs
        );

        return { outcome: "rejected", intention: rejected, reasons: [rejected.rejectionReason] };
      }
    }

    // Construir intenção preliminar
    const riskLevel: RiskLevel = this.policy.classifyRisk(
      {
        intentionId,
        agentId,
        correlationId,
        type,
        payload,
        status: "PENDING",
        baseProjectionHash: currentProjectionHash,
        baseFileHashes: opts.baseFileHashes ?? {},
        riskLevel: "LOW",
        description: `${type} by ${agentId}`,
        createdAt: now,
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
        ttlMs,
      },
      projection
    );

    const intention: Intention<IntentionPayloadMap[T]> = {
      intentionId,
      agentId,
      correlationId,
      type,
      payload,
      status: "PENDING",
      baseProjectionHash: currentProjectionHash,
      baseFileHashes: opts.baseFileHashes ?? {},
      riskLevel,
      description: `${type} proposta por ${agentId}`,
      createdAt: now,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      ttlMs,
    };

    // Emitir INTENTION_PROPOSED
    const proposeResult = this.store.append(
      PIPELINE_STREAM_ID,
      agentId,
      "INTENTION_PROPOSED",
      {
        intentionId,
        type,
        agentId,
        baseProjectionHash: currentProjectionHash,
        baseFileHashes: opts.baseFileHashes ?? {},
        riskLevel,
        description: intention.description,
      },
      { agentId, schemaVersion: "2.0.0" },
      { correlationId, causationId }
    );

    // Atualizar projeção
    const proposedEvent = this.store.getEventById(proposeResult.eventId);
    if (proposedEvent) {
      this.projections.applyOperationalEvent(proposedEvent);
      this.projections.applyAuditEvent(proposedEvent);
    }

    // Avaliar política
    const policyResult = this.policy.evaluate(intention, projection);
    if (!policyResult.approved) {
      return this.rejectIntention(
        intention,
        "POLICY_ENGINE",
        policyResult.rejectionReasons.join("; "),
        [],
        correlationId,
        causationId
      );
    }

    // Verificar invariantes
    const invariantResult = this.invariants.check(intention, projection);
    if (!invariantResult.valid) {
      const violatedIds = invariantResult.violations.map(v => v.invariantId);
      const message = invariantResult.violations
        .map(v => `[${v.invariantId}] ${v.description}`)
        .join("; ");

      return this.rejectIntention(
        intention,
        "INVARIANT_ENGINE",
        message,
        violatedIds,
        correlationId,
        causationId
      );
    }

    // Aprovar
    return this.approveIntention(intention, correlationId, causationId);
  }

  // ─── Aprovação ─────────────────────────────────────────────────────────────

  private approveIntention<P>(
    intention: Intention<P>,
    correlationId: string,
    causationId: string | null
  ): { outcome: "approved"; intention: ApprovedIntention<P> } {
    const now = new Date().toISOString();

    const approveResult = this.store.append(
      PIPELINE_STREAM_ID,
      intention.agentId,
      "INTENTION_APPROVED",
      {
        intentionId: intention.intentionId,
        approvedBy: "POLICY_ENGINE",
      },
      { agentId: intention.agentId, schemaVersion: "2.0.0" },
      { correlationId, causationId }
    );

    const approvedEvent = this.store.getEventById(approveResult.eventId);
    if (approvedEvent) {
      this.projections.applyOperationalEvent(approvedEvent);
      this.projections.applyAuditEvent(approvedEvent);
    }

    const approved: ApprovedIntention<P> = {
      ...intention,
      status: "APPROVED",
      approvedBy: "POLICY_ENGINE",
      approvedAt: now,
    };

    return { outcome: "approved", intention: approved };
  }

  // ─── Rejeição ──────────────────────────────────────────────────────────────

  private rejectIntention<P>(
    intention: Intention<P>,
    rejectedBy: RejectedIntention["rejectedBy"],
    reason: string,
    violatedInvariants: string[],
    correlationId: string,
    causationId: string | null
  ): { outcome: "rejected"; intention: RejectedIntention<P>; reasons: string[] } {
    const now = new Date().toISOString();

    const rejectResult = this.store.append(
      PIPELINE_STREAM_ID,
      intention.agentId,
      "INTENTION_REJECTED",
      {
        intentionId: intention.intentionId,
        rejectedBy,
        reason,
        violatedInvariants,
      },
      { agentId: intention.agentId, schemaVersion: "2.0.0" },
      { correlationId, causationId }
    );

    const rejectedEvent = this.store.getEventById(rejectResult.eventId);
    if (rejectedEvent) {
      this.projections.applyOperationalEvent(rejectedEvent);
      this.projections.applyAuditEvent(rejectedEvent);
    }

    const rejected: RejectedIntention<P> = {
      ...intention,
      status: "REJECTED",
      rejectedBy,
      rejectionReason: reason,
      violatedInvariants,
      rejectedAt: now,
    };

    return { outcome: "rejected", intention: rejected, reasons: [reason] };
  }

  // ─── Concurrency Check ────────────────────────────────────────────────────

  /**
   * Verifica se houve mudanças concorrentes na projeção.
   * Retorna safe=true se os hashes coincidem.
   */
  private checkConcurrency(
    expectedHash: string,
    actualHash: string,
    baseFileHashes: Record<string, string>
  ): ConcurrencyCheckResult {
    if (expectedHash === actualHash) {
      return {
        safe: true,
        currentProjectionHash: actualHash,
        conflictingFiles: [],
        conflictingEventIds: [],
      };
    }

    // Identificar arquivos conflitantes (simplificado: todos em baseFileHashes)
    const conflictingFiles = Object.keys(baseFileHashes);

    return {
      safe: false,
      currentProjectionHash: actualHash,
      conflictingFiles,
      conflictingEventIds: [],
    };
  }

  // ─── Builder Helpers ──────────────────────────────────────────────────────

  private buildRejectedIntention<P>(
    intentionId: string,
    agentId: string,
    correlationId: string,
    type: IntentionType,
    payload: P,
    baseProjectionHash: string,
    baseFileHashes: Record<string, string>,
    rejectedBy: RejectedIntention["rejectedBy"],
    reason: string,
    violatedInvariants: string[],
    now: string,
    ttlMs: number
  ): RejectedIntention<P> {
    return {
      intentionId,
      agentId,
      correlationId,
      type,
      payload,
      status: "REJECTED",
      baseProjectionHash,
      baseFileHashes,
      riskLevel: "LOW",
      description: `${type} by ${agentId}`,
      createdAt: now,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      ttlMs,
      rejectedBy,
      rejectionReason: reason,
      violatedInvariants,
      rejectedAt: now,
    };
  }

  // ─── Utilitários ──────────────────────────────────────────────────────────

  /**
   * Calcula o hash SHA-256 de um conjunto de arquivos.
   * Útil para construir baseFileHashes antes de uma proposta.
   */
  static hashFiles(files: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      result[path] = createHash("sha256").update(content).digest("hex");
    }
    return result;
  }
}
