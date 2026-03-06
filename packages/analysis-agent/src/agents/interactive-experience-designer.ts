/**
 * @fileoverview Versão interativa do Experience Designer Agent.
 * Apresenta design de experiência e coleta feedback via LLM.
 * Todas as interações são geradas dinamicamente.
 * @module agents/interactive-experience-designer
 * @version 2.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const XD_SYSTEM = `Você é um Designer de Experiências. Crie uma visão personalizada da experiência do usuário para o projeto.

REGRAS:
1. Adapte a linguagem ao perfil do usuário
2. Não use frases prontas - personalize cada resposta
3. Seja criativo e específico ao projeto

Retorne JSON:
{
  "experienceVision": "visão detalhada da experiência",
  "keyFeatures": ["features principais contextualizadas"],
  "emotionalGoal": "objetivo emocional do projeto",
  "summary": "resumo adaptado ao perfil do usuário",
  "presentationMessage": "mensagem de apresentação da experiência para o usuário"
}`;

const ADJUSTMENT_SYSTEM = `Você ajusta o design da experiência com base no feedback do usuário.
Responda APENAS com JSON:
{
  "feedback": "resposta ao usuário sobre os ajustes",
  "adjustments": { "descrição dos ajustes" },
  "readyToGenerate": bool,
  "followUpQuestion": "pergunta de follow-up se necessário"
}`;

const APPROVAL_DETECTOR_SYSTEM = `Analise se a resposta do usuário indica aprovação para gerar o código.
Responda APENAS com JSON:
{
  "isApproval": bool,
  "confidence": 0-1,
  "feedback": "resposta apropriada ao usuário"
}`;

/**
 * Versão interativa do ExperienceDesignerAgent.
 * Todas as interações são geradas dinamicamente pelo LLM.
 */
export class InteractiveExperienceDesignerAgent implements InteractiveAgent {
  agentType = "experience_designer" as const;
  private client: OpenAI;
  private model: string;
  private approved = false;

  constructor(client: OpenAI, model?: string) {
    this.client = client;
    this.model = model || "gpt-4o-mini";
  }

  async initiateConversation(context: ConversationContext): Promise<AgentMessage> {
    this.approved = false;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: XD_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Perfil do usuário: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}
Contexto emocional: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}
Preferências de interação: ${JSON.stringify(context.accumulatedData["interactionData"] || {})}
Decisões técnicas: ${JSON.stringify(context.accumulatedData["decisionsData"] || {})}

Crie uma visão da experiência e apresente ao usuário de forma personalizada.
Inclua uma pergunta final sobre se pode gerar o código.`
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      const features = Array.isArray(parsed.keyFeatures)
        ? parsed.keyFeatures.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")
        : "";

      const message = parsed.presentationMessage ||
        (parsed.summary + (features ? `\n\nCaracterísticas principais:\n${features}` : ""));

      return {
        type: "statement",
        content: message
      };
    } catch {
      const fallbackMessage = await this.generateFallbackPresentation(context);
      return {
        type: "statement",
        content: fallbackMessage
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    // Primeiro, detecta se é aprovação
    const approvalCheck = await this.checkApproval(userMessage, context);

    if (approvalCheck.isApproval) {
      this.approved = true;
      return {
        understood: true,
        feedback: approvalCheck.feedback,
        dataExtracted: { experienceApproved: true },
        nextAction: "proceed_to_next",
        agentMessage: { type: "feedback", content: approvalCheck.feedback }
      };
    }

    // Processar ajustes
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: ADJUSTMENT_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Feedback do usuário: "${userMessage}"
Contexto acumulado: ${JSON.stringify(context.accumulatedData)}

Processe o feedback e ajuste o design. Gere resposta personalizada.`
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      if (parsed.readyToGenerate) {
        this.approved = true;
      }

      return {
        understood: true,
        feedback: parsed.feedback,
        dataExtracted: { experienceAdjustments: parsed.adjustments || {} },
        nextAction: this.approved ? "proceed_to_next" : "continue",
        agentMessage: this.approved
          ? { type: "feedback", content: parsed.feedback }
          : { type: "question", content: parsed.followUpQuestion || parsed.feedback }
      };
    } catch {
      this.approved = true;
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
        model: this.model,
        messages: [
          { role: "system", content: APPROVAL_DETECTOR_SYSTEM },
          {
            role: "user",
            content: `Projeto: "${context.originalUserPrompt}"
Resposta do usuário: "${userMessage}"

Detecte se o usuário está aprovando/concordando para gerar o código.
Gere uma resposta apropriada.`
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
        feedback: parsed.feedback || "Iniciando geração..."
      };
    } catch {
      // Fallback: detecta palavras-chave básicas
      const lower = userMessage.toLowerCase();
      const isApproval = lower.includes("sim") || lower.includes("gerar") ||
        lower.includes("pode") || lower.includes("ok") || lower.includes("vamos");

      return {
        isApproval,
        feedback: isApproval ? "Iniciando a geração do projeto..." : ""
      };
    }
  }

  private async generateFallbackPresentation(context: ConversationContext): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "Gere uma breve apresentação de experiência para o projeto. Termine perguntando se pode gerar. Responda apenas com o texto." },
          { role: "user", content: `Projeto: ${context.originalUserPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 300
      });
      return response.choices[0]?.message?.content?.trim() ||
        "Preparei uma experiência baseada nas suas necessidades. Posso gerar o projeto?";
    } catch {
      return "Preparei uma experiência baseada nas suas necessidades. Posso gerar o projeto?";
    }
  }

  private async generateFallbackAdjustment(context: ConversationContext): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "Gere uma resposta breve confirmando ajustes e iniciando geração. Responda apenas com o texto." },
          { role: "user", content: `Projeto: ${context.originalUserPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      return response.choices[0]?.message?.content?.trim() ||
        "Incorporei suas sugestões. Iniciando a geração...";
    } catch {
      return "Incorporei suas sugestões. Iniciando a geração...";
    }
  }

  canProceedToNext(): boolean {
    return this.approved;
  }

  generateSummary(context: ConversationContext): string {
    return context.accumulatedData["experienceApproved"]
      ? "Design aprovado."
      : "Design definido automaticamente.";
  }
}
