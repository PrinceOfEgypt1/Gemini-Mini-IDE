/**
 * @fileoverview Versão interativa do Adaptive Interaction Agent.
 * Define estratégia de comunicação via conversa dinâmica.
 * Todas as perguntas e respostas são geradas pelo LLM.
 * @module agents/interactive-adaptive-interaction
 * @version 2.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const ADAPT_SYSTEM = `Você é um Estrategista de Comunicação. Defina a estratégia de interação baseada no perfil e emoções do usuário.

REGRAS:
1. Adapte suas perguntas ao perfil do usuário
2. Não use frases prontas - personalize cada resposta
3. Extraia preferências de autonomia e comunicação

Retorne JSON:
{
  "understood": true,
  "feedback": "resposta personalizada ao usuário",
  "dataExtracted": {
    "autonomyLevel": 0-1 (0=guiado, 1=autônomo),
    "tone": "string (técnico, casual, formal, etc)",
    "useEmojis": bool,
    "suggestGamification": bool,
    "communicationPreference": "string"
  },
  "nextAction": "proceed_to_next"
}`;

const QUESTION_GENERATOR_SYSTEM = `Você gera perguntas para entender as preferências de comunicação do usuário.
Adapte ao perfil e contexto do projeto.
Responda APENAS com a pergunta, sem formatação.`;

/**
 * Versão interativa do AdaptiveInteractionAgent.
 * Todas as interações são geradas dinamicamente pelo LLM.
 */
export class InteractiveAdaptiveInteractionAgent implements InteractiveAgent {
  agentType = "adaptive_interaction" as const;
  private client: OpenAI;
  private answered = false;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async initiateConversation(context: ConversationContext): Promise<AgentMessage> {
    this.answered = false;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: QUESTION_GENERATOR_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Perfil do usuário: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}
Contexto emocional: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}

Gere uma pergunta para entender como o usuário prefere interagir:
- Quer autonomia total ou prefere ser guiado?
- Prefere explicações técnicas ou simplificadas?
- Quer tomar decisões ou delegar?

A pergunta deve ser contextualizada ao projeto e perfil.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const question = response.choices[0]?.message?.content?.trim() ||
        "Como você prefere que eu te ajude neste projeto?";

      return {
        type: "question",
        content: question
      };
    } catch {
      return {
        type: "question",
        content: "Como você prefere que eu te ajude neste projeto?"
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    this.answered = true;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ADAPT_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Resposta do usuário sobre preferências: "${userMessage}"
Perfil: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}
Emoções: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}

Analise e defina a estratégia de interação. Gere feedback personalizado confirmando o entendimento.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      return {
        understood: true,
        feedback: parsed.feedback,
        dataExtracted: { interactionData: parsed.dataExtracted || {} },
        nextAction: "proceed_to_next",
        agentMessage: { type: "statement", content: parsed.feedback }
      };
    } catch {
      const fallbackMessage = await this.generateFallbackMessage(context);
      return {
        understood: true,
        feedback: fallbackMessage,
        dataExtracted: { interactionData: { autonomyLevel: 0.5, tone: "colaborativo" } },
        nextAction: "proceed_to_next"
      };
    }
  }

  private async generateFallbackMessage(context: ConversationContext): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Gere uma resposta breve confirmando que entendeu as preferências do usuário. Responda apenas com a frase." },
          { role: "user", content: `Projeto: ${context.originalUserPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      return response.choices[0]?.message?.content?.trim() || "Entendi suas preferências.";
    } catch {
      return "Entendi suas preferências.";
    }
  }

  canProceedToNext(): boolean {
    return this.answered;
  }

  generateSummary(context: ConversationContext): string {
    const data = context.accumulatedData["interactionData"] as Record<string, unknown> | undefined;
    return data ? `Autonomia: ${data["autonomyLevel"]}, Tom: ${data["tone"]}` : "Estratégia padrão.";
  }
}
