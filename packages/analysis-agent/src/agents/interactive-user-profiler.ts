/**
 * @fileoverview Versão interativa do User Profiler Agent.
 * Constrói perfil do usuário via conversa dinâmica.
 * Todas as perguntas são geradas pelo LLM.
 * @module agents/interactive-user-profiler
 * @version 2.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";
import type { UserProfile } from "../types/transformative-schemas.js";
import { UserProfileSchema } from "../types/transformative-schemas.js";

const PROFILER_SYSTEM = `Você é um Assistente Amigável que constrói perfis de usuário.
Analise a resposta e extraia informações de perfil.

REGRAS:
1. Adapte suas perguntas ao contexto do projeto
2. Não use frases prontas - personalize cada resposta
3. Extraia: nível de conhecimento, faixa etária, estilo de comunicação, preferência de autonomia

Retorne JSON:
{
  "understood": true/false,
  "feedback": "resposta amigável e contextualizada",
  "dataExtracted": {
    "knowledgeLevel": "beginner|intermediate|advanced|expert",
    "ageGroup": "child|teen|adult|senior",
    "communicationStyle": "technical|casual|formal|simple",
    "autonomyPreference": "guided|collaborative|autonomous"
  },
  "nextAction": "continue"|"proceed_to_next",
  "nextQuestion": "próxima pergunta contextualizada (se nextAction=continue)"
}`;

const QUESTION_GENERATOR_SYSTEM = `Você gera perguntas amigáveis para conhecer o usuário.
Contextualize ao projeto dele.
Responda APENAS com a pergunta, sem formatação adicional.`;

/**
 * Versão interativa do UserProfilerAgent.
 * Todas as interações são geradas dinamicamente pelo LLM.
 */
export class InteractiveUserProfilerAgent implements InteractiveAgent {
  agentType = "user_profiler" as const;
  private client: OpenAI;
  private model: string;
  private interactionCount = 0;
  private readonly maxInteractions = 4;

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

Gere a PRIMEIRA pergunta para conhecer o usuário. Pergunte sobre:
- Nível de experiência com tecnologia
- De forma amigável e contextualizada ao projeto`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const question = response.choices[0]?.message?.content?.trim() ||
        "Para te ajudar melhor, qual seu nível de experiência com tecnologia?";

      return {
        type: "question",
        content: question
      };
    } catch {
      return {
        type: "question",
        content: "Para te ajudar melhor, qual seu nível de experiência com tecnologia?"
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    this.interactionCount++;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: PROFILER_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Resposta do usuário: "${userMessage}"
Dados já coletados: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}
Interação ${this.interactionCount} de ${this.maxInteractions}

Analise a resposta e extraia informações de perfil.
Se precisar de mais informações e ainda não atingiu o limite, gere próxima pergunta.
Se já tem dados suficientes ou atingiu o limite, use nextAction: "proceed_to_next".`
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
          userProfileData: {
            ...(context.accumulatedData["userProfileData"] as Record<string, unknown> || {}),
            ...parsed.dataExtracted
          }
        },
        nextAction: isDone ? "proceed_to_next" : "continue",
        agentMessage: !isDone && parsed.nextQuestion
          ? { type: "question", content: parsed.nextQuestion }
          : undefined
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
          { role: "system", content: "Gere uma resposta amigável breve para continuar a conversa. Responda apenas com a frase." },
          { role: "user", content: `Projeto: ${context.originalUserPrompt}` }
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
    return this.interactionCount >= this.maxInteractions || !!context.accumulatedData["userProfileData"];
  }

  generateSummary(context: ConversationContext): string {
    const data = context.accumulatedData["userProfileData"];
    if (!data) return "Perfil não mapeado.";

    const validation = UserProfileSchema.safeParse(data);
    if (validation.success) {
      const p = validation.data as UserProfile;
      return `Perfil: ${p.knowledgeLevel}, ${p.communicationStyle}, autonomia: ${p.autonomyPreference}`;
    }
    return `Perfil parcial coletado.`;
  }
}
