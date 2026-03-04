/**
 * @fileoverview Versão interativa do Emotional Intelligence Agent.
 * Detecta estado emocional via conversa empática.
 * Todas as perguntas e respostas são geradas dinamicamente pelo LLM.
 * @module agents/interactive-emotional-intelligence
 * @version 2.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const EI_SYSTEM = `Você é um Assistente Empático especializado em entender o estado emocional do usuário.
Seu objetivo é fazer perguntas empáticas para mapear como o usuário se sente em relação ao projeto.

REGRAS:
1. Faça perguntas abertas e acolhedoras
2. Adapte o tom ao contexto do projeto
3. Não use frases prontas - seja genuíno e contextual
4. Extraia: emoção primária, intensidade, motivações, medos, necessidade de encorajamento

Retorne JSON com:
{
  "understood": true/false,
  "feedback": "resposta empática contextualizada",
  "dataExtracted": {
    "primaryEmotion": "string",
    "emotionalIntensity": 0-1,
    "motivationalDrivers": ["array"],
    "fears": ["array"],
    "needsEncouragement": bool,
    "suggestedTone": "string"
  },
  "nextAction": "continue"|"proceed_to_next",
  "nextQuestion": "próxima pergunta contextualizada (se nextAction=continue)"
}`;

const QUESTION_GENERATOR_SYSTEM = `Você gera perguntas empáticas para entender o estado emocional do usuário sobre seu projeto.
Gere uma pergunta aberta, acolhedora e contextualizada ao projeto.
Responda APENAS com a pergunta, sem formatação adicional.`;

/**
 * Versão interativa do EmotionalIntelligenceAgent.
 * Todas as interações são geradas dinamicamente pelo LLM.
 */
export class InteractiveEmotionalIntelligenceAgent implements InteractiveAgent {
  agentType = "emotional_intelligence" as const;
  private client: OpenAI;
  private model: string;
  private interactionCount = 0;
  private readonly maxInteractions = 3;

  constructor(client: OpenAI, model?: string) {
    this.client = client;
    this.model = model || "gpt-4o-mini";
  }

  async initiateConversation(context: ConversationContext): Promise<AgentMessage> {
    this.interactionCount = 0;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: QUESTION_GENERATOR_SYSTEM },
          {
            role: "user",
            content: `Projeto do usuário: "${context.originalUserPrompt}"
Perfil do usuário: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}

Gere a PRIMEIRA pergunta empática para entender como o usuário se sente em relação a este projeto.
A pergunta deve ser aberta e acolhedora.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const question = response.choices[0]?.message?.content?.trim() ||
        "Como você está se sentindo em relação a esse projeto?";

      return {
        type: "question",
        content: question
      };
    } catch {
      return {
        type: "question",
        content: "Como você está se sentindo em relação a esse projeto?"
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    this.interactionCount++;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: EI_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Resposta do usuário: "${userMessage}"
Dados emocionais anteriores: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}
Interação ${this.interactionCount} de ${this.maxInteractions}

Analise a resposta e gere feedback empático. Se precisar de mais informação e ainda não atingiu o limite, gere próxima pergunta.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      const isDone = this.interactionCount >= this.maxInteractions || parsed.nextAction === "proceed_to_next";

      return {
        understood: parsed.understood !== false,
        feedback: parsed.feedback,
        dataExtracted: {
          emotionalData: {
            ...(context.accumulatedData["emotionalData"] as Record<string, unknown> || {}),
            ...parsed.dataExtracted
          }
        },
        nextAction: isDone ? "proceed_to_next" : "continue",
        agentMessage: !isDone && parsed.nextQuestion
          ? { type: "question", content: parsed.nextQuestion }
          : { type: "statement", content: parsed.feedback }
      };
    } catch {
      return {
        understood: true,
        feedback: await this.generateFallbackMessage(context),
        dataExtracted: {},
        nextAction: this.interactionCount >= this.maxInteractions ? "proceed_to_next" : "continue"
      };
    }
  }

  private async generateFallbackMessage(context: ConversationContext): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "Gere uma resposta empática breve para continuar a conversa. Responda apenas com a frase." },
          { role: "user", content: `Contexto do projeto: ${context.originalUserPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      return response.choices[0]?.message?.content?.trim() || "Entendi, vamos continuar.";
    } catch {
      return "Entendi, vamos continuar.";
    }
  }

  canProceedToNext(context: ConversationContext): boolean {
    return this.interactionCount >= this.maxInteractions || !!context.accumulatedData["emotionalData"];
  }

  generateSummary(context: ConversationContext): string {
    const data = context.accumulatedData["emotionalData"] as Record<string, unknown> | undefined;
    if (!data) return "Contexto emocional não mapeado.";
    return `Emoção: ${data["primaryEmotion"] || "não identificada"}, Tom: ${data["suggestedTone"] || "neutro"}`;
  }
}
