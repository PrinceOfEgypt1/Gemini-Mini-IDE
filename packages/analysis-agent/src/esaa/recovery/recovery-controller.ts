/**
 * @fileoverview Recovery Controller do ESAA Hardened v2.
 *
 * Gerencia operações de recuperação do sistema:
 *   - Rollback para snapshots de projeção
 *   - Replay de eventos
 *   - Quarentena e reintegração de agentes
 *   - Compensação de operações falhas
 *
 * @module esaa/recovery/recovery-controller
 * @version 2.0.0
 */

import type { EventStore } from "../store/event-store.js";
import type { ProjectionEngine } from "../projections/projection-engine.js";
import type { PromotionController } from "../promotion/promotion-controller.js";
import type { OperationalProjection } from "../types/projections.js";
import { PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID } from "../projections/projection-engine.js";
import {
  createEmptyOperationalProjection,
  replayEventsToOperational,
} from "../projections/operational-projection.js";
import {
  createEmptyAuditProjection,
  replayEventsToAudit,
} from "../projections/audit-projection.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Resultado de uma operação de recovery. */
export interface RecoveryResult {
  success: boolean;
  operation: RecoveryOperation;
  description: string;
  details: Record<string, string | number | boolean>;
}

/** Tipos de operação de recovery disponíveis. */
export type RecoveryOperation =
  | "ROLLBACK_TO_SNAPSHOT"
  | "ROLLBACK_LAST_PROMOTION"
  | "FULL_REPLAY"
  | "INCREMENTAL_REPLAY"
  | "QUARANTINE_AGENT"
  | "REINSTATE_AGENT"
  | "CREATE_SNAPSHOT"
  | "COMPENSATE";

/** Parâmetros para quarentena de agente. */
export interface QuarantineParams {
  agentId: string;
  reason: string;
  triggeringEventId: string;
  operatorId: string;
}

/** Parâmetros para reintegração de agente. */
export interface ReinstateParams {
  agentId: string;
  operatorId: string;
}

// ─── RecoveryController ───────────────────────────────────────────────────────

/**
 * Controller central para operações de recovery do ESAA.
 */
export class RecoveryController {
  /** Threshold de falhas consecutivas para quarentena automática. */
  private readonly AUTO_QUARANTINE_THRESHOLD = 5;

  constructor(
    private readonly store: EventStore,
    private readonly projections: ProjectionEngine,
    private readonly promotion: PromotionController
  ) {}

  // ─── Snapshots ─────────────────────────────────────────────────────────────

  /**
   * Cria snapshots de ambas as projeções (operacional + audit).
   * @returns IDs dos snapshots criados
   */
  createSnapshots(operatorId: string): { operationalSnapshotId: string; auditSnapshotId: string } {
    const operationalSnapshotId = this.projections.snapshotOperational();
    const auditSnapshotId = this.projections.snapshotAudit();

    // Registrar evento de snapshot
    this.store.append(
      PIPELINE_STREAM_ID,
      GLOBAL_AGGREGATE_ID,
      "SNAPSHOT_CREATED",
      {
        snapshotId: operationalSnapshotId,
        aggregateId: GLOBAL_AGGREGATE_ID,
        version: this.projections.getOperational().lastAppliedVersion,
        stateBytes: JSON.stringify(this.projections.getOperational()).length,
      },
      { agentId: operatorId, schemaVersion: "2.0.0" }
    );

    return { operationalSnapshotId, auditSnapshotId };
  }

  // ─── Rollback ──────────────────────────────────────────────────────────────

  /**
   * Restaura a projeção operacional ao estado de um snapshot específico.
   * Não apaga eventos (append-only), mas redefine a projeção ativa.
   */
  rollbackToSnapshot(snapshotId: string, operatorId: string): RecoveryResult {
    try {
      const projection = this.projections.restoreFromSnapshot(snapshotId);

      this.store.append(
        PIPELINE_STREAM_ID,
        GLOBAL_AGGREGATE_ID,
        "ROLLBACK_COMPLETED",
        {
          restoredSnapshotId: snapshotId,
          restoredVersion: projection.lastAppliedVersion,
          filesRestored: 0, // Snapshot apenas restaura projeção, não arquivos
        },
        { agentId: operatorId, schemaVersion: "2.0.0" }
      );

      return {
        success: true,
        operation: "ROLLBACK_TO_SNAPSHOT",
        description: `Projeção restaurada para o snapshot ${snapshotId} (versão ${projection.lastAppliedVersion})`,
        details: {
          snapshotId,
          restoredVersion: projection.lastAppliedVersion,
        },
      };
    } catch (err) {
      return {
        success: false,
        operation: "ROLLBACK_TO_SNAPSHOT",
        description: `Falha ao restaurar snapshot: ${err instanceof Error ? err.message : String(err)}`,
        details: { snapshotId },
      };
    }
  }

  /**
   * Reverte a última promoção de um correlation ID.
   */
  async rollbackLastPromotion(
    correlationId: string,
    operatorId: string,
    targetDir?: string
  ): Promise<RecoveryResult> {
    // Buscar eventos de promoção aprovada para este correlationId
    const events = this.store.getCorrelationEvents(correlationId);
    const lastApproval = events
      .filter(e => e.type === "PROMOTION_APPROVED")
      .at(-1);

    if (!lastApproval) {
      return {
        success: false,
        operation: "ROLLBACK_LAST_PROMOTION",
        description: `Nenhuma promoção aprovada encontrada para correlationId ${correlationId}`,
        details: { correlationId },
      };
    }

    const batchId = (lastApproval.payload as { batchId: string }).batchId;

    try {
      await this.promotion.rollback(batchId, operatorId, correlationId, "rollback manual", targetDir);

      return {
        success: true,
        operation: "ROLLBACK_LAST_PROMOTION",
        description: `Promoção ${batchId} revertida com sucesso`,
        details: { correlationId, batchId },
      };
    } catch (err) {
      return {
        success: false,
        operation: "ROLLBACK_LAST_PROMOTION",
        description: `Falha ao reverter promoção: ${err instanceof Error ? err.message : String(err)}`,
        details: { correlationId, batchId },
      };
    }
  }

  // ─── Replay ────────────────────────────────────────────────────────────────

  /**
   * Faz replay completo de todos os eventos para reconstruir as projeções.
   * Útil após corrupção de dados ou migração.
   */
  async fullReplay(operatorId: string): Promise<RecoveryResult> {
    try {
      // Invalidar cache
      this.projections.invalidateCache();

      // Buscar todos os eventos em ordem
      const allEvents = this.store.getStreamEvents(PIPELINE_STREAM_ID);

      // Reconstruir projeção operacional
      const operational = allEvents.length > 0
        ? replayEventsToOperational(allEvents)
        : createEmptyOperationalProjection();

      // Reconstruir projeção de auditoria
      const audit = allEvents.length > 0
        ? replayEventsToAudit(allEvents)
        : createEmptyAuditProjection();

      // Persistir ambas
      this.store.saveProjection(
        "operational",
        GLOBAL_AGGREGATE_ID,
        operational.lastAppliedVersion,
        JSON.stringify(operational)
      );

      this.store.saveProjection(
        "audit",
        GLOBAL_AGGREGATE_ID,
        audit.lastAppliedVersion,
        JSON.stringify(audit)
      );

      this.store.append(
        PIPELINE_STREAM_ID,
        GLOBAL_AGGREGATE_ID,
        "ROLLBACK_COMPLETED",
        {
          restoredSnapshotId: "FULL_REPLAY",
          restoredVersion: operational.lastAppliedVersion,
          filesRestored: allEvents.length,
        },
        { agentId: operatorId, schemaVersion: "2.0.0" }
      );

      return {
        success: true,
        operation: "FULL_REPLAY",
        description: `Replay completo de ${allEvents.length} eventos concluído`,
        details: {
          totalEvents: allEvents.length,
          restoredVersion: operational.lastAppliedVersion,
          agentCount: Object.keys(operational.agents).length,
        },
      };
    } catch (err) {
      return {
        success: false,
        operation: "FULL_REPLAY",
        description: `Falha no replay: ${err instanceof Error ? err.message : String(err)}`,
        details: {},
      };
    }
  }

  /**
   * Faz replay incremental desde uma versão específica.
   */
  async replayFromVersion(fromVersion: number, operatorId: string): Promise<RecoveryResult> {
    try {
      const newEvents = this.store.query({
        streamId: PIPELINE_STREAM_ID,
        sinceVersion: fromVersion,
      });

      if (newEvents.length === 0) {
        return {
          success: true,
          operation: "INCREMENTAL_REPLAY",
          description: "Nenhum evento novo desde a versão especificada",
          details: { fromVersion },
        };
      }

      // Carregar projeção atual e aplicar novos eventos
      const currentProjection = this.projections.getOperational();
      const updated = replayEventsToOperational(newEvents, currentProjection);

      this.store.saveProjection(
        "operational",
        GLOBAL_AGGREGATE_ID,
        updated.lastAppliedVersion,
        JSON.stringify(updated)
      );

      this.projections.invalidateCache();

      this.store.append(
        PIPELINE_STREAM_ID,
        GLOBAL_AGGREGATE_ID,
        "ROLLBACK_COMPLETED",
        {
          restoredSnapshotId: `INCREMENTAL_FROM_${fromVersion}`,
          restoredVersion: updated.lastAppliedVersion,
          filesRestored: newEvents.length,
        },
        { agentId: operatorId, schemaVersion: "2.0.0" }
      );

      return {
        success: true,
        operation: "INCREMENTAL_REPLAY",
        description: `${newEvents.length} eventos aplicados desde versão ${fromVersion}`,
        details: {
          fromVersion,
          eventsApplied: newEvents.length,
          newVersion: updated.lastAppliedVersion,
        },
      };
    } catch (err) {
      return {
        success: false,
        operation: "INCREMENTAL_REPLAY",
        description: `Falha no replay incremental: ${err instanceof Error ? err.message : String(err)}`,
        details: { fromVersion },
      };
    }
  }

  // ─── Quarentena ────────────────────────────────────────────────────────────

  /**
   * Coloca um agente em quarentena.
   * O agente não poderá propor intenções de execução enquanto quarentenado.
   */
  quarantineAgent(params: QuarantineParams): RecoveryResult {
    const { agentId, reason, triggeringEventId, operatorId } = params;

    // Verificar se agente existe e não está já quarentenado
    const projection = this.projections.getOperational();
    const agentState = projection.agents[agentId];

    if (agentState?.status === "QUARANTINED") {
      return {
        success: false,
        operation: "QUARANTINE_AGENT",
        description: `Agente ${agentId} já está quarentenado`,
        details: { agentId, currentStatus: "QUARANTINED" },
      };
    }

    const failureCount = agentState?.failureCount ?? 0;

    // Emitir evento de quarentena
    const quarantineResult = this.store.append(
      PIPELINE_STREAM_ID,
      GLOBAL_AGGREGATE_ID,
      "AGENT_QUARANTINED",
      {
        agentId,
        reason,
        failureCount,
        triggeringEventId,
      },
      { agentId: operatorId, schemaVersion: "2.0.0" }
    );

    const quarantineEvent = this.store.getEventById(quarantineResult.eventId);
    if (quarantineEvent) {
      this.projections.applyOperationalEvent(quarantineEvent);
      this.projections.applyAuditEvent(quarantineEvent);
    }

    // Atualizar registro de agente no banco
    const updatedProjection = this.projections.getOperational();
    const updatedAgent = updatedProjection.agents[agentId];
    if (updatedAgent) {
      this.store.upsertAgent({
        agentId,
        model: updatedAgent.model,
        status: "quarantined",
        failureCount: updatedAgent.failureCount,
        consecutiveFailures: updatedAgent.consecutiveFailures,
        lastFailureAt: updatedAgent.lastFailureAt,
        quarantinedAt: new Date().toISOString(),
        quarantineReason: reason,
      });
    }

    return {
      success: true,
      operation: "QUARANTINE_AGENT",
      description: `Agente ${agentId} quarentenado: ${reason}`,
      details: { agentId, reason, failureCount },
    };
  }

  /**
   * Reintegra um agente quarentenado ao sistema.
   */
  reinstateAgent(params: ReinstateParams): RecoveryResult {
    const { agentId, operatorId } = params;

    const projection = this.projections.getOperational();
    const agentState = projection.agents[agentId];

    if (!agentState) {
      return {
        success: false,
        operation: "REINSTATE_AGENT",
        description: `Agente ${agentId} não encontrado no sistema`,
        details: { agentId },
      };
    }

    if (agentState.status !== "QUARANTINED") {
      return {
        success: false,
        operation: "REINSTATE_AGENT",
        description: `Agente ${agentId} não está quarentenado (status: ${agentState.status})`,
        details: { agentId, currentStatus: agentState.status },
      };
    }

    // Emitir evento de reintegração
    const reinstateResult = this.store.append(
      PIPELINE_STREAM_ID,
      GLOBAL_AGGREGATE_ID,
      "AGENT_REINSTATED",
      { agentId, reinstatedBy: operatorId },
      { agentId: operatorId, schemaVersion: "2.0.0" }
    );

    const reinstateEvent = this.store.getEventById(reinstateResult.eventId);
    if (reinstateEvent) {
      this.projections.applyOperationalEvent(reinstateEvent);
      this.projections.applyAuditEvent(reinstateEvent);
    }

    // Atualizar banco
    this.store.upsertAgent({
      agentId,
      model: agentState.model,
      status: "active",
      failureCount: agentState.failureCount,
      consecutiveFailures: 0,
      lastFailureAt: agentState.lastFailureAt,
      quarantinedAt: null,
      quarantineReason: null,
    });

    return {
      success: true,
      operation: "REINSTATE_AGENT",
      description: `Agente ${agentId} reintegrado por ${operatorId}`,
      details: { agentId, operatorId },
    };
  }

  // ─── Verificação de Auto-Quarentena ────────────────────────────────────────

  /**
   * Verifica se um agente deve ser quarentenado automaticamente.
   * Chamado após cada falha de execução.
   */
  checkAutoQuarantine(
    agentId: string,
    triggeringEventId: string
  ): RecoveryResult | null {
    const projection = this.projections.getOperational();
    const agentState = projection.agents[agentId];

    if (!agentState || agentState.status === "QUARANTINED") return null;

    if (agentState.consecutiveFailures >= this.AUTO_QUARANTINE_THRESHOLD) {
      return this.quarantineAgent({
        agentId,
        reason: `Auto-quarentena após ${agentState.consecutiveFailures} falhas consecutivas`,
        triggeringEventId,
        operatorId: "ESAA_AUTO_RECOVERY",
      });
    }

    return null;
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  /**
   * Retorna status atual de recovery do sistema.
   */
  getSystemStatus(): {
    projection: OperationalProjection;
    activeAgents: number;
    quarantinedAgents: number;
    activeIntentions: number;
    activeWorkspaces: number;
    activePromotions: number;
  } {
    const projection = this.projections.getOperational();
    const agents = Object.values(projection.agents);

    return {
      projection,
      activeAgents: agents.filter(a => a.status === "ACTIVE").length,
      quarantinedAgents: agents.filter(a => a.status === "QUARANTINED").length,
      activeIntentions: Object.keys(projection.activeIntentions).length,
      activeWorkspaces: Object.keys(projection.activeWorkspaces).length,
      activePromotions: Object.keys(projection.activePromotions).length,
    };
  }
}
