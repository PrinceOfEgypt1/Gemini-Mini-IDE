/**
 * @fileoverview Versão interativa do Emotional Intelligence Agent.
 * Detecta estado emocional via conversa empática.
 * @module agents/interactive-emotional-intelligence
 * @version 1.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const EI_SYSTEM = `Você é um Assistente Empático. Analise a resposta emocional do usuário.
Retorne JSON com: { "understood": true/false, "feedback": "resposta empática", "dataExtracted": { "primaryEmotion": string, "emotionalIntensity": 0-1, "motivationalDrivers": [], "fears": [], "needsEncouragement": bool, "suggestedTone": string }, "nextAction": "continue"|"proceed_to_next" }`;

/**
 * Versão interativa do EmotionalIntelligenceAgent.
 * Faz 2-3 perguntas empáticas para mapear estado emocional.
 */
export class InteractiveEmotionalIntelligenceAgent implements InteractiveAgent {
  agentType = "emotional_intelligence" as const;
  private client: OpenAI;
  private questionIndex = 0;

  private readonly questions = [
    "Agora me conta: como você está se sentindo em relação a esse projeto? Pode ser sincero — ansioso, empolgado, inseguro, determinado?",
    "O que mais te motiva a criar isso? E tem algo que te preocupa?",
    "Perfeito, já tenho uma boa ideia de como te ajudar da melhor forma!"
  ];

  constructor(client: OpenAI) {
    this.client = client;
  }

  async initiateConversation(_context: ConversationContext): Promise<AgentMessage> {
    this.questionIndex = 0;
    return {
      type: "question",
      content: this.questions[0]!,
      options: ["Estou empolgado!", "Um pouco nervoso", "Tranquilo", "Frustrado com tentativas anteriores"]
    };
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EI_SYSTEM },
          { role: "user", content: `Resposta do usuário: "${userMessage}"\nPergunta: "${this.questions[this.questionIndex]}"\nDados anteriores: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}` }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      this.questionIndex++;
      const isDone = this.questionIndex >= this.questions.length - 1;

      return {
        understood: parsed.understood !== false,
        feedback: parsed.feedback || "Obrigado por compartilhar!",
        dataExtracted: { emotionalData: { ...(context.accumulatedData["emotionalData"] as Record<string, unknown> || {}), ...parsed.dataExtracted } },
        nextAction: isDone ? "proceed_to_next" : "continue",
        agentMessage: !isDone ? { type: "question", content: this.questions[this.questionIndex]! } : { type: "statement", content: this.questions[this.questions.length - 1]! }
      };
    } catch {
      this.questionIndex++;
      return {
        understood: true,
        feedback: "Obrigado! Vamos seguir.",
        dataExtracted: {},
        nextAction: this.questionIndex >= this.questions.length - 1 ? "proceed_to_next" : "continue"
      };
    }
  }

  canProceedToNext(context: ConversationContext): boolean {
    return this.questionIndex >= this.questions.length - 1 || !!context.accumulatedData["emotionalData"];
  }

  generateSummary(context: ConversationContext): string {
    const data = context.accumulatedData["emotionalData"] as Record<string, unknown> | undefined;
    if (!data) return "Contexto emocional: neutro (dados insuficientes).";
    return `Emoção: ${data["primaryEmotion"] || "neutra"}, Tom: ${data["suggestedTone"] || "profissional"}`;
  }
}
