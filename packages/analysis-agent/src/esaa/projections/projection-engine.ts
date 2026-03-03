/**
 * @fileoverview Engine de gestão e replay das projeções do ESAA v2.
 *
 * Responsável por:
 *   - Carregar projeções do EventStore (com suporte a snapshot)
 *   - Aplicar eventos incrementalmente (replay parcial eficiente)
 *   - Persistir projeções atualizadas
 *   - Fornecer API de consulta para o restante do sistema
 *
 * @module esaa/projections/projection-engine
 * @version 2.0.0
 */

import type { EventStore } from "../store/event-store.js";
import type { OperationalProjection, AuditProjection } from "../types/projections.js";
import {
  createEmptyOperationalProjection,
  applyEventToOperational,
  replayEventsToOperational,
} from "./operational-projection.js";
import {
  createEmptyAuditProjection,
  applyEventToAudit,
  replayEventsToAudit,
} from "./audit-projection.js";

/** Aggregate ID global usado para o pipeline principal. */
export const GLOBAL_AGGREGATE_ID = "global";

/** Stream ID para eventos de pipeline. */
export const PIPELINE_STREAM_ID = "pipeline:global";

// ─── ProjectionEngine ────────────────────────────────────────────────────────

/**
 * Engine de projeções: mantém e sincroniza o estado derivado dos eventos.
 */
export class ProjectionEngine {
  /** Cache em memória das projeções (evita re-leitura do disco). */
  private operationalCache: OperationalProjection | null = null;
  private auditCache: AuditProjection | null = null;

  constructor(private readonly store: EventStore) {}

  // ─── Projeção Operacional ──────────────────────────────────────────────────

  /**
   * Retorna a projeção operacional atualizada.
   *
   * Estratégia:
   *   1. Carrega do cache em memória
   *   2. Busca snapshot mais recente do disco
   *   3. Aplica eventos incrementalmente desde o snapshot
   *   4. Persiste o estado atualizado
   */
  getOperational(): OperationalProjection {
    // Cache hit
    if (this.operationalCache) {
      const latestVersion = this.store.getStreamVersion(PIPELINE_STREAM_ID);
      if (latestVersion === this.operationalCache.lastAppliedVersion) {
        return this.operationalCache;
      }
    }

    const projection = this.rebuildOperational();
    this.operationalCache = projection;
    return projection;
  }

  /**
   * Aplica um evento e persiste a projeção atualizada.
   * Chamado pelo EventStore após cada append.
   */
  applyOperationalEvent(event: Parameters<typeof applyEventToOperational>[1]): OperationalProjection {
    const current = this.operationalCache ?? this.rebuildOperational();
    const updated = applyEventToOperational(current, event);

    this.operationalCache = updated;
    this.persistOperational(updated);

    return updated;
  }

  /**
   * Retorna o hash SHA-256 atual da projeção operacional.
   * Usado pelo Concurrency Guard.
   */
  getOperationalHash(): string {
    const stored = this.store.getProjectionHash("operational", GLOBAL_AGGREGATE_ID);
    if (stored) return stored;

    return this.getOperational().hash;
  }

  // ─── Projeção de Auditoria ─────────────────────────────────────────────────

  /**
   * Retorna a projeção de auditoria atualizada.
   */
  getAudit(): AuditProjection {
    if (this.auditCache) {
      const latestVersion = this.store.getStreamVersion(PIPELINE_STREAM_ID);
      if (latestVersion === this.auditCache.lastAppliedVersion) {
        return this.auditCache;
      }
    }

    const projection = this.rebuildAudit();
    this.auditCache = projection;
    return projection;
  }

  /**
   * Aplica um evento à projeção de auditoria.
   */
  applyAuditEvent(event: Parameters<typeof applyEventToAudit>[1]): AuditProjection {
    const current = this.auditCache ?? this.rebuildAudit();
    const updated = applyEventToAudit(current, event);

    this.auditCache = updated;
    this.persistAudit(updated);

    return updated;
  }

  // ─── Rebuild (Replay) ──────────────────────────────────────────────────────

  /**
   * Reconstrói a projeção operacional do zero (ou desde o snapshot mais recente).
   */
  private rebuildOperational(): OperationalProjection {
    // 1. Tentar carregar do banco de dados
    const persisted = this.store.loadProjection("operational", GLOBAL_AGGREGATE_ID);
    if (persisted) {
      const projection = JSON.parse(persisted.state) as OperationalProjection;

      // 2. Buscar eventos incrementais desde a última versão persisted
      const newEvents = this.store.getStreamEventsSince(
        PIPELINE_STREAM_ID,
        persisted.lastAppliedVersion
      );

      if (newEvents.length === 0) return projection;

      const updated = replayEventsToOperational(newEvents, projection);
      this.persistOperational(updated);
      return updated;
    }

    // 3. Tentar carregar snapshot
    const snapshot = this.store.loadLatestSnapshot(GLOBAL_AGGREGATE_ID, "operational");
    if (snapshot) {
      const snapshotProjection = JSON.parse(snapshot.state) as OperationalProjection;
      const newEvents = this.store.getStreamEventsSince(
        PIPELINE_STREAM_ID,
        snapshot.version
      );

      const updated = newEvents.length > 0
        ? replayEventsToOperational(newEvents, snapshotProjection)
        : snapshotProjection;

      this.persistOperational(updated);
      return updated;
    }

    // 4. Replay completo
    const allEvents = this.store.getStreamEvents(PIPELINE_STREAM_ID);
    if (allEvents.length === 0) {
      return createEmptyOperationalProjection();
    }

    const projection = replayEventsToOperational(allEvents);
    this.persistOperational(projection);
    return projection;
  }

  /**
   * Reconstrói a projeção de auditoria.
   */
  private rebuildAudit(): AuditProjection {
    const persisted = this.store.loadProjection("audit", GLOBAL_AGGREGATE_ID);
    if (persisted) {
      const projection = JSON.parse(persisted.state) as AuditProjection;
      const newEvents = this.store.getStreamEventsSince(
        PIPELINE_STREAM_ID,
        persisted.lastAppliedVersion
      );

      if (newEvents.length === 0) return projection;

      const updated = replayEventsToAudit(newEvents, projection);
      this.persistAudit(updated);
      return updated;
    }

    const snapshot = this.store.loadLatestSnapshot(GLOBAL_AGGREGATE_ID, "audit");
    if (snapshot) {
      const snapshotProjection = JSON.parse(snapshot.state) as AuditProjection;
      const newEvents = this.store.getStreamEventsSince(
        PIPELINE_STREAM_ID,
        snapshot.version
      );

      const updated = newEvents.length > 0
        ? replayEventsToAudit(newEvents, snapshotProjection)
        : snapshotProjection;

      this.persistAudit(updated);
      return updated;
    }

    const allEvents = this.store.getStreamEvents(PIPELINE_STREAM_ID);
    if (allEvents.length === 0) {
      return createEmptyAuditProjection();
    }

    const projection = replayEventsToAudit(allEvents);
    this.persistAudit(projection);
    return projection;
  }

  // ─── Snapshot ──────────────────────────────────────────────────────────────

  /**
   * Cria snapshot da projeção operacional e persiste no EventStore.
   * @returns ID do snapshot criado
   */
  snapshotOperational(): string {
    const projection = this.getOperational();
    const state = JSON.stringify(projection);

    return this.store.createSnapshot(
      GLOBAL_AGGREGATE_ID,
      PIPELINE_STREAM_ID,
      "operational",
      projection.lastAppliedVersion,
      state
    );
  }

  /**
   * Cria snapshot da projeção de auditoria.
   */
  snapshotAudit(): string {
    const projection = this.getAudit();
    const state = JSON.stringify(projection);

    return this.store.createSnapshot(
      GLOBAL_AGGREGATE_ID,
      PIPELINE_STREAM_ID,
      "audit",
      projection.lastAppliedVersion,
      state
    );
  }

  /**
   * Restaura a projeção operacional para o estado de um snapshot.
   * Descarta o cache em memória, forçando reconstrução no próximo acesso.
   */
  restoreFromSnapshot(snapshotId: string): OperationalProjection {
    const snapshot = this.store.loadSnapshotById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot não encontrado: ${snapshotId}`);
    }

    if (snapshot.projectionType !== "operational") {
      throw new Error(
        `Snapshot ${snapshotId} é do tipo ${snapshot.projectionType}, não 'operational'`
      );
    }

    // Verificar integridade do snapshot
    const expectedHash = this.store.sha256(snapshot.state);
    if (expectedHash !== snapshot.stateHash) {
      throw new Error(
        `Snapshot ${snapshotId} corrompido: hash esperado ${snapshot.stateHash}, calculado ${expectedHash}`
      );
    }

    const projection = JSON.parse(snapshot.state) as OperationalProjection;

    // Invalidar cache
    this.operationalCache = null;

    // Persistir como estado atual
    this.persistOperational(projection);
    this.operationalCache = projection;

    return projection;
  }

  // ─── Invalidação de Cache ──────────────────────────────────────────────────

  /**
   * Invalida o cache em memória, forçando reload na próxima consulta.
   * Útil após operações de recovery.
   */
  invalidateCache(): void {
    this.operationalCache = null;
    this.auditCache = null;
  }

  // ─── Persistência ─────────────────────────────────────────────────────────

  private persistOperational(projection: OperationalProjection): void {
    this.store.saveProjection(
      "operational",
      GLOBAL_AGGREGATE_ID,
      projection.lastAppliedVersion,
      JSON.stringify(projection)
    );
  }

  private persistAudit(projection: AuditProjection): void {
    this.store.saveProjection(
      "audit",
      GLOBAL_AGGREGATE_ID,
      projection.lastAppliedVersion,
      JSON.stringify(projection)
    );
  }
}
