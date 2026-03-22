/**
 * @fileoverview Event Store transacional do ESAA Hardened v2.
 *
 * Características:
 *   - Append-only: eventos nunca são modificados ou removidos
 *   - Idempotente: chaves de idempotência previnem duplicatas
 *   - Otimistic concurrency: versão do stream verifica conflitos
 *   - Transacional: append + atualização de stream são atômicos
 *   - Projeções: mantém estado atual para query eficiente
 *
 * @module esaa/store/event-store
 * @version 2.0.0
 */

import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { SCHEMA_DDL, SCHEMA_VERSION, QUERIES } from "./schema.js";
import type {
  ESAAEvent,
  ESAAEventType,
  ESAAEventPayloadMap,
} from "../types/events.js";

// ─── Types Internos ───────────────────────────────────────────────────────────

/** Row da tabela events como retornado pelo SQLite. */
interface EventRow {
  event_id: string;
  stream_id: string;
  correlation_id: string;
  causation_id: string | null;
  type: string;
  aggregate_id: string;
  version: number | bigint;
  timestamp: string;
  payload: string;
  metadata: string;
  idempotency_key: string | null;
}

/** Row da tabela event_streams. */
interface StreamRow {
  stream_id: string;
  aggregate_id: string;
  current_version: number | bigint;
  created_at: string;
  updated_at: string;
}

/** Row da tabela projections. */
interface ProjectionRow {
  projection_id: string;
  type: string;
  aggregate_id: string;
  last_applied_version: number | bigint;
  state: string;
  hash: string;
  updated_at: string;
}

/** Opções para consulta de eventos. */
export interface EventQueryOptions {
  /** Filtrar por stream. */
  streamId?: string;
  /** Filtrar por correlationId. */
  correlationId?: string;
  /** Filtrar por tipo. */
  type?: ESAAEventType;
  /** Somente eventos após esta versão (global). */
  sinceVersion?: number;
  /** Máximo de resultados retornados. */
  limit?: number;
}

/** Resultado de uma append bem-sucedida. */
export interface AppendResult {
  eventId: string;
  streamId: string;
  version: number;
}

// ─── EventStore ───────────────────────────────────────────────────────────────

/**
 * Event Store transacional baseado em SQLite (node:sqlite built-in).
 *
 * Singleton por caminho de banco de dados. Crie uma instância por processo.
 */
export class EventStore {
  private readonly db: DatabaseSync;
  private readonly dbPath: string;

  /**
   * @param dbPath Caminho para o arquivo SQLite. ':memory:' para in-memory.
   */
  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? join(process.cwd(), ".esaa-events.db");
    this.db = new DatabaseSync(this.dbPath);
    this.initialize();
  }

  // ─── Inicialização ──────────────────────────────────────────────────────────

  /**
   * Aplica DDL e verifica versão do schema.
   */
  private initialize(): void {
    this.db.exec(SCHEMA_DDL);

    const versionRow = this.db
      .prepare(QUERIES.SELECT_SCHEMA_VERSION)
      .get() as { version: number } | undefined;

    if (!versionRow) {
      this.db
        .prepare(QUERIES.INSERT_SCHEMA_VERSION)
        .run(SCHEMA_VERSION, new Date().toISOString());
    }
  }

  // ─── Append ─────────────────────────────────────────────────────────────────

  /**
   * Adiciona um evento ao store de forma atômica.
   *
   * @param streamId    ID do stream (ex: `pipeline:${correlationId}`)
   * @param aggregateId ID do aggregate (ex: `agent:${agentId}`)
   * @param type        Tipo do evento
   * @param payload     Payload tipado pelo type
   * @param metadata    Metadados de rastreabilidade
   * @param options     correlationId, causationId, idempotencyKey
   *
   * @throws {Error} Se a chave de idempotência já foi usada para este tipo
   */
  append<T extends ESAAEventType>(
    streamId: string,
    aggregateId: string,
    type: T,
    payload: ESAAEventPayloadMap[T],
    metadata: ESAAEvent["metadata"],
    options: {
      correlationId?: string;
      causationId?: string | null;
      idempotencyKey?: string;
    } = {}
  ): AppendResult {
    const {
      correlationId = randomUUID(),
      causationId = null,
      idempotencyKey,
    } = options;

    // Buscar versão atual do stream
    const streamRow = this.db
      .prepare(QUERIES.SELECT_STREAM)
      .get(streamId) as StreamRow | undefined;

    const currentVersion = streamRow
      ? Number(streamRow.current_version)
      : 0;
    const nextVersion = currentVersion + 1;

    const eventId = randomUUID();
    const timestamp = new Date().toISOString();

    // Inserção atômica: evento + atualização do stream
    this.db.exec("BEGIN");

    try {
      this.db.prepare(QUERIES.INSERT_EVENT).run(
        eventId,
        streamId,
        correlationId,
        causationId,
        type,
        aggregateId,
        nextVersion,
        timestamp,
        JSON.stringify(payload),
        JSON.stringify(metadata),
        idempotencyKey ?? null
      );

      this.db.prepare(QUERIES.UPSERT_STREAM).run(
        streamId,
        aggregateId,
        nextVersion,
        streamRow ? streamRow.created_at : timestamp,
        timestamp
      );

      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }

    return { eventId, streamId, version: nextVersion };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  /**
   * Busca um evento pelo ID.
   * @returns null se não encontrado
   */
  getEventById(eventId: string): ESAAEvent | null {
    const row = this.db
      .prepare(QUERIES.SELECT_EVENT_BY_ID)
      .get(eventId) as EventRow | undefined;

    return row ? this.rowToEvent(row) : null;
  }

  /**
   * Retorna todos os eventos de um stream, ordenados por versão.
   */
  getStreamEvents(streamId: string): ESAAEvent[] {
    const rows = this.db
      .prepare(QUERIES.SELECT_EVENTS_BY_STREAM)
      .all(streamId) as unknown as EventRow[];

    return rows.map(r => this.rowToEvent(r));
  }

  /**
   * Retorna eventos de um stream após uma versão específica.
   * Útil para replay incremental de projeções.
   */
  getStreamEventsSince(streamId: string, afterVersion: number): ESAAEvent[] {
    const rows = this.db
      .prepare(QUERIES.SELECT_EVENTS_SINCE_VERSION)
      .all(streamId, afterVersion) as unknown as EventRow[];

    return rows.map(r => this.rowToEvent(r));
  }

  /**
   * Retorna todos os eventos de um correlation ID (fluxo completo).
   */
  getCorrelationEvents(correlationId: string): ESAAEvent[] {
    const rows = this.db
      .prepare(QUERIES.SELECT_EVENTS_BY_CORRELATION)
      .all(correlationId) as unknown as EventRow[];

    return rows.map(r => this.rowToEvent(r));
  }

  /**
   * Retorna os N eventos mais recentes de um tipo.
   */
  getEventsByType(type: ESAAEventType, limit = 100): ESAAEvent[] {
    const rows = this.db
      .prepare(QUERIES.SELECT_EVENTS_BY_TYPE)
      .all(type, limit) as unknown as EventRow[];

    return rows.map(r => this.rowToEvent(r));
  }

  /**
   * Consulta flexível de eventos.
   */
  query(opts: EventQueryOptions): ESAAEvent[] {
    if (opts.streamId) {
      const events = opts.sinceVersion !== undefined
        ? this.getStreamEventsSince(opts.streamId, opts.sinceVersion)
        : this.getStreamEvents(opts.streamId);
      return opts.limit ? events.slice(0, opts.limit) : events;
    }

    if (opts.correlationId) {
      const events = this.getCorrelationEvents(opts.correlationId);
      return opts.limit ? events.slice(0, opts.limit) : events;
    }

    if (opts.type) {
      return this.getEventsByType(opts.type, opts.limit ?? 100);
    }

    if (opts.sinceVersion !== undefined) {
      const rows = this.db
        .prepare(QUERIES.SELECT_ALL_EVENTS_SINCE)
        .all(opts.sinceVersion) as unknown as EventRow[];
      const events = rows.map(r => this.rowToEvent(r));
      return opts.limit ? events.slice(0, opts.limit) : events;
    }

    return [];
  }

  /**
   * Retorna a versão atual de um stream.
   * @returns 0 se o stream não existe.
   */
  getStreamVersion(streamId: string): number {
    const row = this.db
      .prepare(QUERIES.SELECT_STREAM_VERSION)
      .get(streamId) as { current_version: number | bigint } | undefined;

    return row ? Number(row.current_version) : 0;
  }

  // ─── Projeções ───────────────────────────────────────────────────────────────

  /**
   * Salva ou atualiza o estado de uma projeção.
   * O hash é calculado automaticamente sobre o state serializado.
   */
  saveProjection(
    type: "operational" | "audit",
    aggregateId: string,
    lastAppliedVersion: number,
    state: string
  ): string {
    const projectionId = `${type}:${aggregateId}`;
    const hash = this.sha256(state);
    const now = new Date().toISOString();

    this.db.prepare(QUERIES.UPSERT_PROJECTION).run(
      projectionId,
      type,
      aggregateId,
      lastAppliedVersion,
      state,
      hash,
      now
    );

    return hash;
  }

  /**
   * Carrega o estado serializado de uma projeção.
   * @returns null se não existe.
   */
  loadProjection(
    type: "operational" | "audit",
    aggregateId: string
  ): { state: string; lastAppliedVersion: number; hash: string } | null {
    const row = this.db
      .prepare(QUERIES.SELECT_PROJECTION)
      .get(type, aggregateId) as ProjectionRow | undefined;

    if (!row) return null;

    return {
      state: row.state,
      lastAppliedVersion: Number(row.last_applied_version),
      hash: row.hash,
    };
  }

  /**
   * Retorna apenas o hash da projeção operacional (para Concurrency Guard).
   * @returns null se não existe.
   */
  getProjectionHash(
    type: "operational" | "audit",
    aggregateId: string
  ): string | null {
    const row = this.db
      .prepare(QUERIES.SELECT_PROJECTION_HASH)
      .get(type, aggregateId) as { hash: string } | undefined;

    return row?.hash ?? null;
  }

  // ─── Snapshots ───────────────────────────────────────────────────────────────

  /**
   * Cria um snapshot de uma projeção.
   */
  createSnapshot(
    aggregateId: string,
    streamId: string,
    projectionType: "operational" | "audit",
    version: number,
    state: string
  ): string {
    const snapshotId = randomUUID();
    const stateHash = this.sha256(state);
    const now = new Date().toISOString();

    this.db.prepare(QUERIES.INSERT_SNAPSHOT).run(
      snapshotId,
      aggregateId,
      streamId,
      projectionType,
      version,
      state,
      stateHash,
      now
    );

    return snapshotId;
  }

  /**
   * Carrega o snapshot mais recente de um aggregate.
   * @returns null se não existe snapshot.
   */
  loadLatestSnapshot(
    aggregateId: string,
    projectionType: "operational" | "audit"
  ): {
    snapshotId: string;
    version: number;
    state: string;
    stateHash: string;
    createdAt: string;
  } | null {
    const row = this.db
      .prepare(QUERIES.SELECT_LATEST_SNAPSHOT)
      .get(aggregateId, projectionType) as
      | {
          snapshot_id: string;
          version: number | bigint;
          state: string;
          state_hash: string;
          created_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      snapshotId: row.snapshot_id,
      version: Number(row.version),
      state: row.state,
      stateHash: row.state_hash,
      createdAt: row.created_at,
    };
  }

  /**
   * Carrega um snapshot pelo ID.
   */
  loadSnapshotById(snapshotId: string): {
    snapshotId: string;
    aggregateId: string;
    projectionType: string;
    version: number;
    state: string;
    stateHash: string;
    createdAt: string;
  } | null {
    const row = this.db
      .prepare(QUERIES.SELECT_SNAPSHOT_BY_ID)
      .get(snapshotId) as
      | {
          snapshot_id: string;
          aggregate_id: string;
          projection_type: string;
          version: number | bigint;
          state: string;
          state_hash: string;
          created_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      snapshotId: row.snapshot_id,
      aggregateId: row.aggregate_id,
      projectionType: row.projection_type,
      version: Number(row.version),
      state: row.state,
      stateHash: row.state_hash,
      createdAt: row.created_at,
    };
  }

  // ─── Promotion Batches ───────────────────────────────────────────────────────

  /**
   * Registra um novo lote de promoção.
   */
  createPromotionBatch(params: {
    batchId: string;
    correlationId: string;
    intentionId: string;
    workspaceId: string;
    workspacePath: string;
    files: string[];
  }): void {
    this.db.prepare(QUERIES.INSERT_PROMOTION_BATCH).run(
      params.batchId,
      params.correlationId,
      params.intentionId,
      params.workspaceId,
      "pending",
      params.workspacePath,
      JSON.stringify(params.files),
      "[]",
      new Date().toISOString()
    );
  }

  /**
   * Atualiza o status de um lote de promoção.
   */
  updatePromotionBatch(
    batchId: string,
    update: {
      status: "running_gates" | "approved" | "rejected" | "rolled_back";
      promotedAt?: string | null;
      rolledBackAt?: string | null;
      rollbackReason?: string | null;
      gateResults?: unknown[];
    }
  ): void {
    this.db.prepare(QUERIES.UPDATE_PROMOTION_STATUS).run(
      update.status,
      update.promotedAt ?? null,
      update.rolledBackAt ?? null,
      update.rollbackReason ?? null,
      JSON.stringify(update.gateResults ?? []),
      batchId
    );
  }

  /**
   * Busca um lote de promoção pelo ID.
   */
  getPromotionBatch(batchId: string): Record<string, unknown> | null {
    const row = this.db
      .prepare(QUERIES.SELECT_PROMOTION_BATCH)
      .get(batchId) as Record<string, unknown> | undefined;

    return row ?? null;
  }

  // ─── Agent Registry ──────────────────────────────────────────────────────────

  /**
   * Registra ou atualiza um agente.
   */
  upsertAgent(params: {
    agentId: string;
    model: string;
    status: "active" | "quarantined";
    failureCount: number;
    consecutiveFailures: number;
    lastFailureAt: string | null;
    quarantinedAt: string | null;
    quarantineReason: string | null;
  }): void {
    const now = new Date().toISOString();
    this.db.prepare(QUERIES.UPSERT_AGENT).run(
      params.agentId,
      params.model,
      params.status,
      params.failureCount,
      params.consecutiveFailures,
      params.lastFailureAt,
      params.quarantinedAt,
      params.quarantineReason,
      now,
      now
    );
  }

  /**
   * Busca um agente pelo ID.
   */
  getAgent(agentId: string): Record<string, unknown> | null {
    const row = this.db
      .prepare(QUERIES.SELECT_AGENT)
      .get(agentId) as Record<string, unknown> | undefined;

    return row ?? null;
  }

  /**
   * Lista todos os agentes.
   */
  listAgents(onlyActive = false): Record<string, unknown>[] {
    const query = onlyActive
      ? QUERIES.SELECT_ACTIVE_AGENTS
      : QUERIES.SELECT_ALL_AGENTS;

    return this.db.prepare(query).all() as Record<string, unknown>[];
  }

  // ─── Utilidades ──────────────────────────────────────────────────────────────

  /**
   * Fecha a conexão com o banco de dados.
   * Deve ser chamado ao encerrar o processo.
   */
  close(): void {
    this.db.close();
  }

  /**
   * Converte uma EventRow do SQLite em um ESAAEvent tipado.
   */
  private rowToEvent(row: EventRow): ESAAEvent {
    return {
      eventId: row.event_id,
      streamId: row.stream_id,
      correlationId: row.correlation_id,
      causationId: row.causation_id,
      type: row.type as ESAAEventType,
      aggregateId: row.aggregate_id,
      version: Number(row.version),
      timestamp: row.timestamp,
      payload: JSON.parse(row.payload) as unknown,
      metadata: JSON.parse(row.metadata) as ESAAEvent["metadata"],
    };
  }

  /**
   * Calcula SHA-256 de uma string.
   */
  sha256(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }
}

// ─── Lazy Singleton ───────────────────────────────────────────────────────────

let _globalEventStore: EventStore | null = null;

/**
 * Returns the global EventStore instance, creating it lazily on first access.
 * Path configurable via ESAA_DB_PATH environment variable.
 *
 * BG-05: Converted from import-time instantiation to lazy init.
 */
export function getGlobalEventStore(): EventStore {
  if (!_globalEventStore) {
    _globalEventStore = new EventStore(process.env["ESAA_DB_PATH"]);
  }
  return _globalEventStore;
}

/**
 * Closes and releases the global EventStore instance.
 * Safe to call when no instance exists (no-op).
 *
 * BG-05: Explicit lifecycle cleanup.
 */
export function closeGlobalEventStore(): void {
  if (_globalEventStore) {
    _globalEventStore.close();
    _globalEventStore = null;
  }
}

/**
 * Resets the global EventStore (close + nullify).
 * Next call to getGlobalEventStore() creates a fresh instance.
 * Primarily for testing.
 *
 * BG-05: Explicit lifecycle reset.
 */
export function resetGlobalEventStore(): void {
  closeGlobalEventStore();
}
