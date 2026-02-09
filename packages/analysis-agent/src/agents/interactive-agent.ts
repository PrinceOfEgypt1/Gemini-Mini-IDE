/**
 * @fileoverview Interface base para agentes interativos conversacionais.
 * @module agents/interactive-agent
 * @version 1.0.0
 */

import type { AgentType, ConversationMessage, AgentPhase } from "../session/types.js";
import type { UserProfile } from "../types/transformative-schemas.js";
import type { EmotionalContext } from "../types/transformative-schemas.js";
import type { InteractionStrategy } from "../types/transformative-schemas.js";

/**
 * Contexto passado entre agentes durante a conversa.
 */
export interface ConversationContext {
  sessionId: string;
  userProfile: UserProfile | null;
  emotionalContext: EmotionalContext | null;
  interactionStrategy: InteractionStrategy | null;
  previousMessages: ConversationMessage[];
  currentPhase: AgentPhase;
  accumulatedData: Record<string, unknown>;
  originalUserPrompt: string;
}

/**
 * Mensagem enviada pelo agente ao usuário.
 */
export interface AgentMessage {
  type: "question" | "statement" | "decision" | "feedback";
  content: string;
  options?: string[];
  followUp?: string;
}

/**
 * Resposta do agente após processar input do usuário.
 */
export interface AgentResponse {
  understood: boolean;
  feedback: string;
  dataExtracted: Record<string, unknown>;
  nextAction: "continue" | "ask_clarification" | "proceed_to_next";
  clarificationQuestion?: string;
  agentMessage?: AgentMessage;
}

/**
 * Interface que todo agente interativo deve implementar.
 */
export interface InteractiveAgent {
  /** Tipo do agente */
  agentType: AgentType;

  /**
   * Inicia a conversa com o usuário. Retorna a primeira mensagem/pergunta.
   */
  initiateConversation(context: ConversationContext): Promise<AgentMessage>;

  /**
   * Processa a resposta do usuário e retorna feedback + próxima ação.
   */
  processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse>;

  /**
   * Verifica se o agente coletou informações suficientes para prosseguir.
   */
  canProceedToNext(context: ConversationContext): boolean;

  /**
   * Gera um resumo do que foi coletado por este agente.
   */
  generateSummary(context: ConversationContext): string;
}
