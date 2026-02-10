/**
 * @fileoverview Versão interativa do Autonomous Decision Engine.
 * Apresenta decisões técnicas e pede confirmação.
 * @module agents/interactive-autonomous-decision
 * @version 1.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const DECISION_SYSTEM = `Você é um Decisor Técnico. Baseado no pedido do usuário e seu perfil, proponha decisões técnicas.
Adapte a linguagem ao nível do usuário. Se for iniciante, não use jargão.
Retorne JSON: { "decisions": [{ "category": string, "decision": string, "rationale": string }], "summary": "resumo das decisões em linguagem adaptada", "questionsForUser": ["perguntas sobre o NEGÓCIO, não sobre tecnologia"] }`;

/**
 * Versão interativa do AutonomousDecisionEngine.
 * Apresenta decisões e pede confirmação/feedback.
 */
export class InteractiveAutonomousDecisionAgent implements InteractiveAgent {
  agentType = "autonomous_decision" as const;
  private client: OpenAI;
  private confirmed = false;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async initiateConversation(context: ConversationContext): Promise<AgentMessage> {
    this.confirmed = false;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: DECISION_SYSTEM },
          { role: "user", content: `Pedido: "${context.originalUserPrompt}"\nPerfil: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}\nEmoções: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}\nAutonomia: ${JSON.stringify(context.accumulatedData["interactionData"] || {})}` }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      const summary = parsed.summary || "Propus algumas decisões técnicas para o seu projeto.";
      const questions = Array.isArray(parsed.questionsForUser) ? parsed.questionsForUser : [];

      const fullContent = questions.length > 0
        ? `${summary}\n\nAntes de prosseguir, tenho algumas perguntas:\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}\n\nVocê concorda com essas decisões?`
        : `${summary}\n\nVocê concorda com essas decisões?`;

      return {
        type: "decision",
        content: fullContent,
        options: ["Sim, concordo!", "Tenho sugestões", "Quero mudar algo"]
      };
    } catch {
      return {
        type: "decision",
        content: "Vou usar as melhores tecnologias para o seu projeto. Posso prosseguir?",
        options: ["Sim, pode prosseguir!", "Quero saber mais detalhes"]
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    const lower = userMessage.toLowerCase();
    const isAgreement = lower.includes("sim") || lower.includes("concord") || lower.includes("pode") || lower.includes("ok") || lower.includes("perfeito");

    if (isAgreement) {
      this.confirmed = true;
      return {
        understood: true,
        feedback: "Ótimo! Decisões confirmadas. Vamos para o design da experiência!",
        dataExtracted: { decisionsConfirmed: true },
        nextAction: "proceed_to_next",
        agentMessage: { type: "feedback", content: "Decisões confirmadas! Agora vou projetar a experiência." }
      };
    }

    // Usuário quer mudanças — processar com LLM
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Analise o feedback do usuário sobre decisões técnicas. Retorne JSON: { \"feedback\": \"resposta adaptada\", \"adjustedDecisions\": {}, \"needsMoreInput\": bool }" },
          { role: "user", content: `Feedback: "${userMessage}"\nDecisões atuais: ${JSON.stringify(context.accumulatedData["decisionsData"] || {})}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      if (!parsed.needsMoreInput) {
        this.confirmed = true;
      }

      return {
        understood: true,
        feedback: parsed.feedback || "Entendido! Ajustei as decisões.",
        dataExtracted: { decisionsData: parsed.adjustedDecisions || {} },
        nextAction: this.confirmed ? "proceed_to_next" : "continue",
        agentMessage: this.confirmed
          ? { type: "feedback", content: "Decisões ajustadas! Vamos continuar." }
          : { type: "question", content: parsed.feedback || "Pode me dar mais detalhes?" }
      };
    } catch {
      this.confirmed = true;
      return {
        understood: true,
        feedback: "Entendido! Vou ajustar e continuar.",
        dataExtracted: {},
        nextAction: "proceed_to_next"
      };
    }
  }

  canProceedToNext(): boolean {
    return this.confirmed;
  }

  generateSummary(context: ConversationContext): string {
    const confirmed = context.accumulatedData["decisionsConfirmed"];
    return confirmed ? "Decisões técnicas confirmadas pelo usuário." : "Decisões técnicas definidas automaticamente.";
  }
}
