/**
 * @fileoverview Versão interativa do Experience Designer Agent.
 * Apresenta design de experiência e coleta feedback.
 * @module agents/interactive-experience-designer
 * @version 1.0.0
 */

import OpenAI from "openai";
import type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./interactive-agent.js";

const XD_SYSTEM = `Você é um Designer de Experiências. Crie uma visão da experiência do usuário para o projeto.
Adapte a linguagem ao perfil do usuário. Se for criança, use linguagem lúdica. Se for expert, use linguagem técnica.
Retorne JSON: { "experienceVision": "visão da experiência", "keyFeatures": ["features principais"], "emotionalGoal": "objetivo emocional", "summary": "resumo adaptado ao usuário" }`;

/**
 * Versão interativa do ExperienceDesignerAgent.
 * Apresenta proposta de experiência e coleta feedback.
 */
export class InteractiveExperienceDesignerAgent implements InteractiveAgent {
  agentType = "experience_designer" as const;
  private client: OpenAI;
  private approved = false;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async initiateConversation(context: ConversationContext): Promise<AgentMessage> {
    this.approved = false;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: XD_SYSTEM },
          { role: "user", content: `Pedido: "${context.originalUserPrompt}"\nPerfil: ${JSON.stringify(context.accumulatedData["userProfileData"] || {})}\nEmoções: ${JSON.stringify(context.accumulatedData["emotionalData"] || {})}\nDecisões: ${JSON.stringify(context.accumulatedData["decisionsData"] || {})}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        (response.choices[0]?.message?.content || "{}").replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim()
      );

      const summary = parsed.summary || "Projetei uma experiência incrível para o seu projeto!";
      const features = Array.isArray(parsed.keyFeatures)
        ? parsed.keyFeatures.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")
        : "";

      return {
        type: "statement",
        content: `${summary}${features ? `\n\nPrincipais características:\n${features}` : ""}\n\nO que achou? Posso gerar o código agora?`,
        options: ["Adorei! Pode gerar!", "Gostei, mas quero ajustar algo", "Quero algo diferente"]
      };
    } catch {
      return {
        type: "statement",
        content: "Vou criar uma experiência incrível baseada em tudo que conversamos. Posso gerar o código?",
        options: ["Sim, gerar!", "Quero ajustar algo primeiro"]
      };
    }
  }

  async processUserResponse(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    const lower = userMessage.toLowerCase();
    const isApproval = lower.includes("sim") || lower.includes("ador") || lower.includes("gost") || lower.includes("gerar") || lower.includes("pode") || lower.includes("perfeito");

    if (isApproval) {
      this.approved = true;
      return {
        understood: true,
        feedback: "Perfeito! Vou gerar o projeto completo agora. Isso pode levar alguns instantes...",
        dataExtracted: { experienceApproved: true },
        nextAction: "proceed_to_next",
        agentMessage: { type: "feedback", content: "Gerando seu projeto..." }
      };
    }

    // Processar ajustes
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ajuste o design da experiência com base no feedback. Retorne JSON: { \"feedback\": \"resposta\", \"adjustments\": {}, \"readyToGenerate\": bool }" },
          { role: "user", content: `Feedback: "${userMessage}"\nContexto: ${JSON.stringify(context.accumulatedData)}` }
        ],
        temperature: 0.3,
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
        feedback: parsed.feedback || "Ajustei o design! O que acha agora?",
        dataExtracted: { experienceAdjustments: parsed.adjustments || {} },
        nextAction: this.approved ? "proceed_to_next" : "continue",
        agentMessage: this.approved
          ? { type: "feedback", content: "Design finalizado! Gerando código..." }
          : { type: "question", content: `${parsed.feedback || "Fiz os ajustes."}\n\nPosso gerar agora?` }
      };
    } catch {
      this.approved = true;
      return {
        understood: true,
        feedback: "Entendido! Vou incorporar suas sugestões e gerar o projeto.",
        dataExtracted: {},
        nextAction: "proceed_to_next"
      };
    }
  }

  canProceedToNext(): boolean {
    return this.approved;
  }

  generateSummary(context: ConversationContext): string {
    return context.accumulatedData["experienceApproved"]
      ? "Design de experiência aprovado pelo usuário."
      : "Design de experiência definido automaticamente.";
  }
}
