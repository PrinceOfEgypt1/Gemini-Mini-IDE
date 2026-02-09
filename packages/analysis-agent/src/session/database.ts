/**
 * @fileoverview Wrapper de banco de dados SQLite para sessões conversacionais.
 * @module session/database
 * @version 1.0.0
 */

import Database from "better-sqlite3";
import { resolve } from "path";

/** Resultado de operações de escrita */
export interface RunResult {
  lastInsertRowid: number | bigint;
  changes: number;
}

/**
 * Gerencia conexão SQLite e execução de queries.
 *
 * @example
 * ```typescript
 * const db = new SessionDatabase('./data/sessions.db');
 * db.initialize();
 * ```
 */
export class SessionDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || resolve(process.cwd(), "data", "sessions.db");
    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  /**
   * Cria as tabelas necessárias para o sistema de sessões.
   */
  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        current_phase TEXT NOT NULL DEFAULT 'human_layer_profiling',
        current_agent TEXT NOT NULL DEFAULT 'user_profiler',
        context_data TEXT NOT NULL DEFAULT '{}',
        metadata TEXT NOT NULL DEFAULT '{"totalMessages":0,"totalIterations":0,"averageResponseTime":0,"userSatisfaction":0}'
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'agent')),
        agent_type TEXT,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        intent TEXT,
        sentiment TEXT,
        entities TEXT,
        agent_action TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);
  }

  /**
   * Executa uma query SELECT e retorna as linhas.
   */
  query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  /**
   * Executa uma query SELECT e retorna a primeira linha.
   */
  queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  /**
   * Executa uma query INSERT/UPDATE/DELETE.
   */
  run(sql: string, params: unknown[] = []): RunResult {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.changes
    };
  }

  /**
   * Fecha a conexão com o banco de dados.
   */
  close(): void {
    this.db.close();
  }
}
