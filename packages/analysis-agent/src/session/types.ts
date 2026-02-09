/**
 * @fileoverview Tipos para o sistema de sessões conversacionais.
 * @module session/types
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// AGENT TYPES & PHASES
// ============================================================================

/** Fases do pipeline conversacional */
export type AgentPhase =
  | "human_layer_profiling"
  | "human_layer_emotions"
  | "human_layer_adaptation"
  | "strategic_layer_decisions"
  | "strategic_layer_experience"
  | "engineering_layer"
  | "completed";

/** Tipos de agentes interativos */
export type AgentType =
  | "user_profiler"
  | "emotional_intelligence"
  | "adaptive_interaction"
  | "autonomous_decision"
  | "experience_designer"
  | "analysis"
  | "product"
  | "architecture"
  | "user_stories"
  | "code_gen";

/** Ordem de execução dos agentes no pipeline */
export const AGENT_PIPELINE: Array<{ phase: AgentPhase; agent: AgentType }> = [
  { phase: "human_layer_profiling", agent: "user_profiler" },
  { phase: "human_layer_emotions", agent: "emotional_intelligence" },
  { phase: "human_layer_adaptation", agent: "adaptive_interaction" },
  { phase: "strategic_layer_decisions", agent: "autonomous_decision" },
  { phase: "strategic_layer_experience", agent: "experience_designer" }
];

// ============================================================================
// CONVERSATION MESSAGE
// ============================================================================

/** Ação realizada pelo agente na mensagem */
export interface AgentAction {
  type: "question" | "statement" | "decision" | "feedback";
  data: Record<string, unknown>;
}

/** Mensagem individual na conversa */
export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: "user" | "agent";
  agentType?: AgentType;
  content: string;
  timestamp: string;
  intent?: string;
  sentiment?: string;
  entities?: string[];
  agentAction?: AgentAction;
}

export const AgentActionSchema = z.object({
  type: z.enum(["question", "statement", "decision", "feedback"]),
  data: z.record(z.unknown())
});

export const ConversationMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(["user", "agent"]),
  agentType: z.string().optional(),
  content: z.string(),
  timestamp: z.string(),
  intent: z.string().optional(),
  sentiment: z.string().optional(),
  entities: z.array(z.string()).optional(),
  agentAction: AgentActionSchema.optional()
});

// ============================================================================
// CONVERSATION SESSION
// ============================================================================

/** Metadados da sessão */
export interface SessionMetadata {
  totalMessages: number;
  totalIterations: number;
  averageResponseTime: number;
  userSatisfaction: number;
}

/** Sessão de conversa completa */
export interface ConversationSession {
  sessionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
  currentPhase: AgentPhase;
  currentAgent: AgentType;
  contextData: Record<string, unknown>;
  metadata: SessionMetadata;
}

export const SessionMetadataSchema = z.object({
  totalMessages: z.number(),
  totalIterations: z.number(),
  averageResponseTime: z.number(),
  userSatisfaction: z.number()
});

export const ConversationSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(ConversationMessageSchema),
  currentPhase: z.string(),
  currentAgent: z.string(),
  contextData: z.record(z.unknown()),
  metadata: SessionMetadataSchema
});
