/**
 * @fileoverview Versão interativa do Adaptive Interaction Agent.
 * Define estratégia de comunicação via pergunta direta.
 * @module agents/interactive-adaptive-interaction
 * @version 1.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const ADAPT_SYSTEM = `Você é um Estrategista de Comunicação. Baseado no perfil e emoções do usuário, defina a estratégia de interação.
Retorne JSON: { "understood": true, "feedback": "mensagem", "dataExtracted": { "autonomyLevel": 0-1, "tone": "string", "useEmojis": bool, "suggestGamification": bool }, "nextAction": "proceed_to_next" }`;

/**
 * Versão interativa do AdaptiveInteractionAgent.
 * Faz 1-2 perguntas sobre preferências de autonomia.
 */
export class InteractiveAdaptiveInteractionAgent implements InteractiveAgent {
  agentType = "adaptive_interaction" as const;
  private client: OpenAI;
  private answered = false;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async initiateConversation(_context: ConversationContext): Promise<AgentMessage> {
    this.answered = false;
    return {
      type: "question",
      content: "Para este projeto, você prefere que eu tome as decisões técnicas automaticamente, ou quer que eu te explique cada passo e decida junto com você?",
      options: [
        "Decide tudo pra mim, confio em você!",
        "Quero entender e decidir junto",
        "Me explica, mas pode sugerir",
        "Sou técnico, quero controle total"
      ]
    };
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    this.answered = true;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ADAPT_SYSTEM },
          { role: "user", content: `Resposta: "${userMessage}"\nPerfil: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}\nEmoções: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}` }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      return {
        understood: true,
        feedback: parsed.feedback || "Perfeito! Vou me adaptar ao seu estilo.",
        dataExtracted: { interactionData: parsed.dataExtracted || {} },
        nextAction: "proceed_to_next",
        agentMessage: { type: "statement", content: parsed.feedback || "Entendido! Vou adaptar tudo ao seu estilo." }
      };
    } catch {
      return {
        understood: true,
        feedback: "Perfeito! Vou usar um modo colaborativo.",
        dataExtracted: { interactionData: { autonomyLevel: 0.5, tone: "colaborativo" } },
        nextAction: "proceed_to_next"
      };
    }
  }

  canProceedToNext(): boolean {
    return this.answered;
  }

  generateSummary(context: ConversationContext): string {
    const data = context.accumulatedData["interactionData"] as Record<string, unknown> | undefined;
    return data ? `Autonomia: ${data["autonomyLevel"]}, Tom: ${data["tone"]}` : "Estratégia: colaborativa (padrão).";
  }
}
