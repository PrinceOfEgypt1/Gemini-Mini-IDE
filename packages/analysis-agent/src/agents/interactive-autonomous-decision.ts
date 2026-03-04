/**
 * @fileoverview Versão interativa do Autonomous Decision Engine.
 * Apresenta decisões técnicas via LLM e coleta feedback.
 * Todas as interações são geradas dinamicamente.
 * @module agents/interactive-autonomous-decision
 * @version 2.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const DECISION_SYSTEM = `Você é um Decisor Técnico que propõe decisões para projetos de software.

REGRAS:
1. Adapte a linguagem ao perfil do usuário
2. Não use jargão técnico com iniciantes
3. Apresente decisões de forma clara e contextualizada
4. Se necessário, faça perguntas sobre o NEGÓCIO (não sobre tecnologia)

Retorne JSON:
{
  "decisions": [{"category": "string", "decision": "string", "rationale": "string"}],
  "summary": "resumo das decisões adaptado ao perfil do usuário",
  "questionsForUser": ["perguntas de negócio se necessário"],
  "presentationMessage": "mensagem completa para apresentar ao usuário"
}`;

const APPROVAL_DETECTOR_SYSTEM = `Analise se a resposta do usuário indica concordância com as decisões técnicas.
Responda APENAS com JSON:
{
  "isApproval": bool,
  "confidence": 0-1,
  "feedback": "resposta apropriada ao usuário"
}`;

const ADJUSTMENT_SYSTEM = `Você ajusta decisões técnicas com base no feedback do usuário.
Responda APENAS com JSON:
{
  "feedback": "resposta adaptada ao feedback",
  "adjustedDecisions": {"decisões ajustadas"},
  "needsMoreInput": bool,
  "followUpQuestion": "pergunta de follow-up se needsMoreInput=true"
}`;

/**
 * Versão interativa do AutonomousDecisionEngine.
 * Todas as interações são geradas dinamicamente pelo LLM.
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
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Perfil do usuário: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}
Contexto emocional: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}
Preferências de interação: ${JSON.stringify(context.accumulatedData["interactionData"] || {})}

Proponha decisões técnicas e apresente ao usuário de forma personalizada.
Termine perguntando se ele concorda.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      const message = parsed.presentationMessage || parsed.summary ||
        "Preparei algumas decisões técnicas para o seu projeto.";

      return {
        type: "decision",
        content: message
      };
    } catch {
      const fallbackMessage = await this.generateFallbackDecisions(context);
      return {
        type: "decision",
        content: fallbackMessage
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    // Primeiro, detecta se é aprovação
    const approvalCheck = await this.checkApproval(userMessage, context);

    if (approvalCheck.isApproval) {
      this.confirmed = true;
      return {
        understood: true,
        feedback: approvalCheck.feedback,
        dataExtracted: { decisionsConfirmed: true },
        nextAction: "proceed_to_next",
        agentMessage: { type: "feedback", content: approvalCheck.feedback }
      };
    }

    // Processar ajustes
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ADJUSTMENT_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Feedback do usuário: "${userMessage}"
Decisões atuais: ${JSON.stringify(context.accumulatedData["decisionsData"] || {})}

Processe o feedback e ajuste as decisões. Gere resposta personalizada.`
          }
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
        feedback: parsed.feedback,
        dataExtracted: { decisionsData: parsed.adjustedDecisions || {} },
        nextAction: this.confirmed ? "proceed_to_next" : "continue",
        agentMessage: this.confirmed
          ? { type: "feedback", content: parsed.feedback }
          : { type: "question", content: parsed.followUpQuestion || parsed.feedback }
      };
    } catch {
      this.confirmed = true;
      const fallbackMessage = await this.generateFallbackAdjustment(context);
      return {
        understood: true,
        feedback: fallbackMessage,
        dataExtracted: {},
        nextAction: "proceed_to_next"
      };
    }
  }

  private async checkApproval(userMessage: string, context: ConversationContext): Promise<{
    isApproval: boolean;
    feedback: string;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: APPROVAL_DETECTOR_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Resposta do usuário: "${userMessage}"

Detecte se o usuário está concordando com as decisões técnicas.
Gere uma resposta apropriada para continuar.`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      return {
        isApproval: parsed.isApproval === true && (parsed.confidence || 0) > 0.6,
        feedback: parsed.feedback || "Decisões confirmadas."
      };
    } catch {
      const lower = userMessage.toLowerCase();
      const isApproval = lower.includes("sim") || lower.includes("concord") ||
        lower.includes("pode") || lower.includes("ok");

      return {
        isApproval,
        feedback: isApproval ? "Decisões confirmadas." : ""
      };
    }
  }

  private async generateFallbackDecisions(context: ConversationContext): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Gere uma breve apresentação de decisões técnicas para o projeto. Termine perguntando se concorda. Responda apenas com o texto." },
          { role: "user", content: `Projeto: ${context.originalUserPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 300
      });
      return response.choices[0]?.message?.content?.trim() ||
        "Preparei as melhores tecnologias para seu projeto. Posso prosseguir?";
    } catch {
      return "Preparei as melhores tecnologias para seu projeto. Posso prosseguir?";
    }
  }

  private async generateFallbackAdjustment(context: ConversationContext): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Gere uma resposta breve confirmando ajustes nas decisões. Responda apenas com o texto." },
          { role: "user", content: `Projeto: ${context.originalUserPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      return response.choices[0]?.message?.content?.trim() || "Ajustes incorporados.";
    } catch {
      return "Ajustes incorporados.";
    }
  }

  canProceedToNext(): boolean {
    return this.confirmed;
  }

  generateSummary(context: ConversationContext): string {
    const confirmed = context.accumulatedData["decisionsConfirmed"];
    return confirmed ? "Decisões técnicas confirmadas." : "Decisões definidas automaticamente.";
  }
}
