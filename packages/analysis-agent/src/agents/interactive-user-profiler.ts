/**
 * @fileoverview Versão interativa do User Profiler Agent.
 * Constrói perfil do usuário via conversa iterativa.
 * @module agents/interactive-user-profiler
 * @version 1.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";
import type { UserProfile } from "../types/transformative-schemas.js";
import { UserProfileSchema } from "../types/transformative-schemas.js";

const PROFILER_SYSTEM = `Você é um Assistente Amigável de Perfil. Analise a resposta do usuário e extraia informações de perfil.
Retorne JSON com: { "understood": true/false, "feedback": "resposta amigável", "dataExtracted": { campos do perfil }, "nextAction": "continue"|"proceed_to_next", "nextQuestion": "próxima pergunta ou vazio" }`;

/**
 * Versão interativa do UserProfilerAgent.
 * Faz 3-4 perguntas para construir perfil completo do usuário.
 */
export class InteractiveUserProfilerAgent implements InteractiveAgent {
  agentType = "user_profiler" as const;
  private client: OpenAI;
  private questionIndex = 0;

  private readonly questions = [
    "Olá! Para te ajudar da melhor forma, me conta: qual é o seu nível de experiência com tecnologia? (Pode ser desde 'nunca usei um computador' até 'sou desenvolvedor sênior')",
    "Legal! E qual é a sua faixa etária aproximada? Isso me ajuda a adaptar a linguagem.",
    "Como você prefere que eu me comunique? De forma mais técnica e direta, ou mais simples e explicativa?",
    "Última pergunta: você prefere que eu tome as decisões técnicas por você, ou quer participar de cada escolha?"
  ];

  constructor(client: OpenAI) {
    this.client = client;
  }

  async initiateConversation(context: ConversationContext): Promise<AgentMessage> {
    this.questionIndex = 0;
    const hasMessages = context.previousMessages.some(m => m.agentType === "user_profiler");
    if (hasMessages) {
      this.questionIndex = Math.min(
        context.previousMessages.filter(m => m.agentType === "user_profiler" && m.role === "agent").length,
        this.questions.length - 1
      );
    }
    return {
      type: "question",
      content: this.questions[0]!,
      options: this.questionIndex === 0
        ? ["Sou iniciante", "Tenho conhecimento intermediário", "Sou avançado/expert"]
        : undefined
    };
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    try {
      const prompt = `Mensagem do usuário: "${userMessage}"
Pergunta feita: "${this.questions[this.questionIndex]}"
Dados já coletados: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}
Pergunta número: ${this.questionIndex + 1} de ${this.questions.length}

Analise a resposta e extraia informações de perfil. Se é a última pergunta ou já tem dados suficientes, use nextAction: "proceed_to_next".`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: PROFILER_SYSTEM },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim());

      this.questionIndex++;
      const isLastQuestion = this.questionIndex >= this.questions.length;
      const nextAction = isLastQuestion || parsed.nextAction === "proceed_to_next" ? "proceed_to_next" : "continue";

      const nextQuestion = !isLastQuestion ? this.questions[this.questionIndex] : undefined;

      return {
        understood: parsed.understood !== false,
        feedback: parsed.feedback || "Entendido!",
        dataExtracted: { userProfileData: { ...(context.accumulatedData["userProfileData"] as Record<string, unknown> || {}), ...parsed.dataExtracted } },
        nextAction: nextAction as AgentResponse["nextAction"],
        agentMessage: nextQuestion ? { type: "question", content: nextQuestion } : undefined
      };
    } catch {
      this.questionIndex++;
      return {
        understood: true,
        feedback: "Entendido! Vamos continuar.",
        dataExtracted: {},
        nextAction: this.questionIndex >= this.questions.length ? "proceed_to_next" : "continue",
        agentMessage: this.questionIndex < this.questions.length
          ? { type: "question", content: this.questions[this.questionIndex]! }
          : undefined
      };
    }
  }

  canProceedToNext(context: ConversationContext): boolean {
    return this.questionIndex >= this.questions.length || !!context.accumulatedData["userProfileData"];
  }

  generateSummary(context: ConversationContext): string {
    const data = context.accumulatedData["userProfileData"];
    if (!data) return "Perfil do usuário: dados insuficientes, usando padrões.";

    const validation = UserProfileSchema.safeParse(data);
    if (validation.success) {
      const p = validation.data as UserProfile;
      return `Perfil: ${p.knowledgeLevel}, ${p.communicationStyle}, autonomia: ${p.autonomyPreference}`;
    }
    return `Perfil parcial coletado: ${JSON.stringify(data)}`;
  }
}
