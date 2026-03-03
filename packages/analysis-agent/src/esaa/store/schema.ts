/**
 * @fileoverview Schema SQLite e migrations para o Event Store do ESAA v2.
 *
 * Tabelas:
 *   - events             : log append-only de eventos
 *   - event_streams      : controle de versão por stream
 *   - snapshots          : snapshots de projeções para recovery rápido
 *   - projections        : estado atual das projeções (operacional + audit)
 *   - promotion_batches  : lotes de promoção com resultado de gates
 *   - agent_registry     : registro e status de agentes
 *
 * @module esaa/store/schema
 * @version 2.0.0
 */

/** Versão do schema – incrementar quando alterar DDL. */
export const SCHEMA_VERSION = 1;

/**
 * DDL completo do Event Store.
 * Executado via DatabaseSync.exec() na inicialização.
 */
export const SCHEMA_DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- Tabela de versão do schema (uma linha)
CREATE TABLE IF NOT EXISTS schema_version (
  version     INTEGER NOT NULL,
  applied_at  TEXT    NOT NULL
);

-- ─── Eventos (append-only) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  event_id          TEXT    NOT NULL PRIMARY KEY,
  stream_id         TEXT    NOT NULL,
  correlation_id    TEXT    NOT NULL,
  causation_id      TEXT,
  type              TEXT    NOT NULL,
  aggregate_id      TEXT    NOT NULL,
  version           INTEGER NOT NULL,
  timestamp         TEXT    NOT NULL,
  payload           TEXT    NOT NULL,   -- JSON
  metadata          TEXT    NOT NULL,   -- JSON
  idempotency_key   TEXT,
  UNIQUE(stream_id, version)
);

CREATE INDEX IF NOT EXISTS idx_events_stream    ON events (stream_id, version);
CREATE INDEX IF NOT EXISTS idx_events_corr      ON events (correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_type      ON events (type);
CREATE INDEX IF NOT EXISTS idx_events_ts        ON events (timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_idempotency
  ON events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─── Streams (controle de versão por aggregate) ──────────────────────────────
CREATE TABLE IF NOT EXISTS event_streams (
  stream_id       TEXT    NOT NULL PRIMARY KEY,
  aggregate_id    TEXT    NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_streams_aggregate ON event_streams (aggregate_id);

-- ─── Snapshots ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
  snapshot_id       TEXT    NOT NULL PRIMARY KEY,
  aggregate_id      TEXT    NOT NULL,
  stream_id         TEXT    NOT NULL,
  projection_type   TEXT    NOT NULL,   -- 'operational' | 'audit'
  version           INTEGER NOT NULL,
  state             TEXT    NOT NULL,   -- JSON serializado da projeção
  state_hash        TEXT    NOT NULL,   -- SHA-256 do state
  created_at        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate ON snapshots (aggregate_id, version DESC);

-- ─── Projeções (estado atual, rebuilt via replay) ─────────────────────────────
CREATE TABLE IF NOT EXISTS projections (
  projection_id         TEXT    NOT NULL PRIMARY KEY,
  type                  TEXT    NOT NULL,   -- 'operational' | 'audit'
  aggregate_id          TEXT    NOT NULL,
  last_applied_version  INTEGER NOT NULL DEFAULT 0,
  state                 TEXT    NOT NULL,   -- JSON serializado
  hash                  TEXT    NOT NULL,   -- SHA-256 do state (para Concurrency Guard)
  updated_at            TEXT    NOT NULL,
  UNIQUE(type, aggregate_id)
);

-- ─── Lotes de promoção ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_batches (
  batch_id            TEXT    NOT NULL PRIMARY KEY,
  correlation_id      TEXT    NOT NULL,
  intention_id        TEXT    NOT NULL,
  workspace_id        TEXT    NOT NULL,
  status              TEXT    NOT NULL,   -- 'pending'|'running_gates'|'approved'|'rejected'|'rolled_back'
  workspace_path      TEXT    NOT NULL,
  files               TEXT    NOT NULL,   -- JSON array de paths
  gate_results        TEXT    NOT NULL DEFAULT '[]',  -- JSON array de GateResult
  created_at          TEXT    NOT NULL,
  promoted_at         TEXT,
  rolled_back_at      TEXT,
  rollback_reason     TEXT
);

CREATE INDEX IF NOT EXISTS idx_promotions_corr   ON promotion_batches (correlation_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotion_batches (status);

-- ─── Registro de agentes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_registry (
  agent_id            TEXT    NOT NULL PRIMARY KEY,
  model               TEXT    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'active',  -- 'active'|'quarantined'
  failure_count       INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at     TEXT,
  quarantined_at      TEXT,
  quarantine_reason   TEXT,
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL
);
`;

/** Queries preparadas usadas pelo EventStore. */
export const QUERIES = {
  // ── Versão do schema ──────────────────────────────────────────────────────
  INSERT_SCHEMA_VERSION:
    "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
  SELECT_SCHEMA_VERSION:
    "SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1",

  // ── Eventos ───────────────────────────────────────────────────────────────
  INSERT_EVENT: `
    INSERT INTO events
      (event_id, stream_id, correlation_id, causation_id, type, aggregate_id,
       version, timestamp, payload, metadata, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

  SELECT_EVENT_BY_ID:
    "SELECT * FROM events WHERE event_id = ?",

  SELECT_EVENTS_BY_STREAM:
    "SELECT * FROM events WHERE stream_id = ? ORDER BY version ASC",

  SELECT_EVENTS_SINCE_VERSION:
    "SELECT * FROM events WHERE stream_id = ? AND version > ? ORDER BY version ASC",

  SELECT_EVENTS_BY_CORRELATION:
    "SELECT * FROM events WHERE correlation_id = ? ORDER BY version ASC",

  SELECT_EVENTS_BY_TYPE:
    "SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT ?",

  SELECT_ALL_EVENTS_SINCE:
    "SELECT * FROM events WHERE version > ? ORDER BY version ASC",

  COUNT_EVENTS_BY_STREAM:
    "SELECT COUNT(*) as count FROM events WHERE stream_id = ?",

  // ── Streams ───────────────────────────────────────────────────────────────
  UPSERT_STREAM: `
    INSERT INTO event_streams (stream_id, aggregate_id, current_version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(stream_id) DO UPDATE SET
      current_version = excluded.current_version,
      updated_at = excluded.updated_at`,

  SELECT_STREAM:
    "SELECT * FROM event_streams WHERE stream_id = ?",

  SELECT_STREAM_VERSION:
    "SELECT current_version FROM event_streams WHERE stream_id = ?",

  // ── Snapshots ─────────────────────────────────────────────────────────────
  INSERT_SNAPSHOT: `
    INSERT INTO snapshots
      (snapshot_id, aggregate_id, stream_id, projection_type, version, state, state_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

  SELECT_LATEST_SNAPSHOT: `
    SELECT * FROM snapshots
    WHERE aggregate_id = ? AND projection_type = ?
    ORDER BY version DESC
    LIMIT 1`,

  SELECT_SNAPSHOT_BY_ID:
    "SELECT * FROM snapshots WHERE snapshot_id = ?",

  // ── Projeções ─────────────────────────────────────────────────────────────
  UPSERT_PROJECTION: `
    INSERT INTO projections
      (projection_id, type, aggregate_id, last_applied_version, state, hash, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(type, aggregate_id) DO UPDATE SET
      last_applied_version = excluded.last_applied_version,
      state = excluded.state,
      hash = excluded.hash,
      updated_at = excluded.updated_at`,

  SELECT_PROJECTION:
    "SELECT * FROM projections WHERE type = ? AND aggregate_id = ?",

  SELECT_PROJECTION_HASH:
    "SELECT hash FROM projections WHERE type = ? AND aggregate_id = ?",

  // ── Promotion Batches ─────────────────────────────────────────────────────
  INSERT_PROMOTION_BATCH: `
    INSERT INTO promotion_batches
      (batch_id, correlation_id, intention_id, workspace_id, status,
       workspace_path, files, gate_results, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,

  UPDATE_PROMOTION_STATUS: `
    UPDATE promotion_batches
    SET status = ?, promoted_at = ?, rolled_back_at = ?, rollback_reason = ?,
        gate_results = ?
    WHERE batch_id = ?`,

  SELECT_PROMOTION_BATCH:
    "SELECT * FROM promotion_batches WHERE batch_id = ?",

  SELECT_PROMOTIONS_BY_STATUS:
    "SELECT * FROM promotion_batches WHERE status = ? ORDER BY created_at DESC",

  // ── Agent Registry ────────────────────────────────────────────────────────
  UPSERT_AGENT: `
    INSERT INTO agent_registry
      (agent_id, model, status, failure_count, consecutive_failures,
       last_failure_at, quarantined_at, quarantine_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      model = excluded.model,
      status = excluded.status,
      failure_count = excluded.failure_count,
      consecutive_failures = excluded.consecutive_failures,
      last_failure_at = excluded.last_failure_at,
      quarantined_at = excluded.quarantined_at,
      quarantine_reason = excluded.quarantine_reason,
      updated_at = excluded.updated_at`,

  SELECT_AGENT:
    "SELECT * FROM agent_registry WHERE agent_id = ?",

  SELECT_ALL_AGENTS:
    "SELECT * FROM agent_registry ORDER BY created_at DESC",

  SELECT_ACTIVE_AGENTS:
    "SELECT * FROM agent_registry WHERE status = 'active' ORDER BY created_at DESC",
} as const;
