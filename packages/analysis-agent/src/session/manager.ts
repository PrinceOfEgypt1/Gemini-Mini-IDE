/**
 * @fileoverview Gerenciador de sessões conversacionais.
 * @module session/manager
 * @version 1.0.0
 */

import { randomUUID } from "crypto";
import { SessionDatabase } from "./database.js";
import type {
  ConversationSession,
  ConversationMessage,
  AgentPhase,
  AgentType,
  AgentAction,
  SessionMetadata
} from "./types.js";

/** Linha bruta da tabela sessions */
interface SessionRow {
  session_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  current_phase: string;
  current_agent: string;
  context_data: string;
  metadata: string;
}

/** Linha bruta da tabela messages */
interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  agent_type: string | null;
  content: string;
  timestamp: string;
  intent: string | null;
  sentiment: string | null;
  entities: string | null;
  agent_action: string | null;
}

/**
 * Gerencia sessões de conversa com persistência em SQLite.
 *
 * @example
 * ```typescript
 * const db = new SessionDatabase();
 * db.initialize();
 * const manager = new SessionManager(db);
 * const session = manager.createSession('user-123');
 * ```
 */
export class SessionManager {
  private db: SessionDatabase;

  constructor(db: SessionDatabase) {
    this.db = db;
  }

  /**
   * Cria uma nova sessão de conversa.
   */
  createSession(userId: string): ConversationSession {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const defaultMetadata: SessionMetadata = {
      totalMessages: 0,
      totalIterations: 0,
      averageResponseTime: 0,
      userSatisfaction: 0
    };

    this.db.run(
      `INSERT INTO sessions (session_id, user_id, created_at, updated_at, current_phase, current_agent, context_data, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, now, now, "human_layer_profiling", "user_profiler", "{}", JSON.stringify(defaultMetadata)]
    );

    return {
      sessionId,
      userId,
      createdAt: now,
      updatedAt: now,
      messages: [],
      currentPhase: "human_layer_profiling",
      currentAgent: "user_profiler",
      contextData: {},
      metadata: defaultMetadata
    };
  }

  /**
   * Recupera uma sessão existente pelo ID.
   */
  getSession(sessionId: string): ConversationSession | null {
    const row = this.db.queryOne<SessionRow>(
      "SELECT * FROM sessions WHERE session_id = ?",
      [sessionId]
    );

    if (!row) return null;

    const messages = this.getMessages(sessionId);

    return {
      sessionId: row.session_id,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages,
      currentPhase: row.current_phase as AgentPhase,
      currentAgent: row.current_agent as AgentType,
      contextData: JSON.parse(row.context_data || "{}"),
      metadata: JSON.parse(row.metadata || "{}")
    };
  }

  /**
   * Atualiza a fase e agente atual da sessão.
   */
  updateSessionPhase(sessionId: string, phase: AgentPhase, agent: AgentType): void {
    const now = new Date().toISOString();
    this.db.run(
      "UPDATE sessions SET current_phase = ?, current_agent = ?, updated_at = ? WHERE session_id = ?",
      [phase, agent, now, sessionId]
    );
  }

  /**
   * Atualiza o contexto acumulado da sessão.
   */
  updateSessionContext(sessionId: string, data: Record<string, unknown>): void {
    const existing = this.db.queryOne<SessionRow>(
      "SELECT context_data FROM sessions WHERE session_id = ?",
      [sessionId]
    );

    const currentContext = existing ? JSON.parse(existing.context_data || "{}") : {};
    const merged = { ...currentContext, ...data };
    const now = new Date().toISOString();

    this.db.run(
      "UPDATE sessions SET context_data = ?, updated_at = ? WHERE session_id = ?",
      [JSON.stringify(merged), now, sessionId]
    );
  }

  /**
   * Adiciona uma mensagem à sessão.
   */
  addMessage(
    sessionId: string,
    role: "user" | "agent",
    content: string,
    agentType?: AgentType,
    agentAction?: AgentAction
  ): ConversationMessage {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    this.db.run(
      `INSERT INTO messages (id, session_id, role, agent_type, content, timestamp, agent_action)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sessionId, role, agentType || null, content, timestamp, agentAction ? JSON.stringify(agentAction) : null]
    );

    // Atualiza metadata
    this.db.run(
      `UPDATE sessions SET
        metadata = json_set(metadata, '$.totalMessages',
          CAST(json_extract(metadata, '$.totalMessages') AS INTEGER) + 1),
        updated_at = ?
       WHERE session_id = ?`,
      [timestamp, sessionId]
    );

    return {
      id,
      sessionId,
      role,
      agentType,
      content,
      timestamp,
      agentAction
    };
  }

  /**
   * Recupera todas as mensagens de uma sessão.
   */
  getMessages(sessionId: string): ConversationMessage[] {
    const rows = this.db.query<MessageRow>(
      "SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC",
      [sessionId]
    );

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role as "user" | "agent",
      agentType: (row.agent_type || undefined) as AgentType | undefined,
      content: row.content,
      timestamp: row.timestamp,
      intent: row.intent || undefined,
      sentiment: row.sentiment || undefined,
      entities: row.entities ? JSON.parse(row.entities) : undefined,
      agentAction: row.agent_action ? JSON.parse(row.agent_action) : undefined
    }));
  }

  /**
   * Lista sessões de um usuário.
   */
  listSessions(userId: string): ConversationSession[] {
    const rows = this.db.query<SessionRow>(
      "SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC",
      [userId]
    );

    return rows.map(row => ({
      sessionId: row.session_id,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: [],
      currentPhase: row.current_phase as AgentPhase,
      currentAgent: row.current_agent as AgentType,
      contextData: JSON.parse(row.context_data || "{}"),
      metadata: JSON.parse(row.metadata || "{}")
    }));
  }

  /**
   * Remove uma sessão e suas mensagens.
   */
  deleteSession(sessionId: string): void {
    this.db.run("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
  }
}
