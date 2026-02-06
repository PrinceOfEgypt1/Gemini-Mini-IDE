/**
 * @fileoverview Autonomous Decision Engine — Toma decisões inteligentes pelo usuário.
 *
 * Quando o usuário não sabe, não quer ou não pode tomar decisões técnicas,
 * este agente assume e faz as melhores escolhas possíveis baseando-se no
 * perfil, emoções, contexto e melhores práticas da indústria.
 *
 * @module agents/autonomous-decision-engine
 * @version 2.0.0
 */

import OpenAI from "openai";
import { AUTONOMOUS_DECISION_PROMPT } from "../prompts/autonomous-decision.js";
import {
  AutonomousDecisionsSchema,
  type AutonomousDecisions,
  type AutonomousDecision,
  type UserQuestion,
  type DecisionCategory,
  type UserProfile,
  type EmotionalContext,
  type InteractionStrategy
} from "../types/transformative-schemas.js";
import type { RichAnalysis } from "../types/rich-schemas.js";

/**
 * Decisões autônomas padrão (conservadoras).
 */
const DEFAULT_DECISIONS: AutonomousDecisions = {
  decisions: [],
  confidenceLevel: 0.3,
  requiresValidation: true,
  questionsForUser: [],
  internalRationale: "Não foi possível gerar decisões autônomas. Usando modo consultivo."
};

/** Categorias válidas de decisão */
const VALID_CATEGORIES: DecisionCategory[] = [
  "platform", "stack", "architecture", "ux", "security",
  "deployment", "accessibility", "monetization", "performance", "content"
];

/** Impactos válidos */
const VALID_IMPACTS = ["low", "medium", "high"] as const;

/**
 * Sanitiza uma decisão individual.
 */
function sanitizeDecision(d: Record<string, unknown>): AutonomousDecision {
  return {
    category: VALID_CATEGORIES.includes(d["category"] as DecisionCategory)
      ? (d["category"] as DecisionCategory)
      : "stack",
    decision: typeof d["decision"] === "string" ? d["decision"] : "Decisão pendente",
    rationale: typeof d["rationale"] === "string" ? d["rationale"] : "Sem justificativa",
    alternatives: Array.isArray(d["alternatives"])
      ? d["alternatives"].filter((item): item is string => typeof item === "string")
      : [],
    confidence: typeof d["confidence"] === "number" && d["confidence"] >= 0 && d["confidence"] <= 1
      ? d["confidence"]
      : 0.5,
    impactIfWrong: VALID_IMPACTS.includes(d["impactIfWrong"] as typeof VALID_IMPACTS[number])
      ? (d["impactIfWrong"] as AutonomousDecision["impactIfWrong"])
      : "medium"
  };
}

/**
 * Sanitiza uma pergunta para o usuário.
 */
function sanitizeUserQuestion(q: Record<string, unknown>): UserQuestion {
  return {
    question: typeof q["question"] === "string" ? q["question"] : "",
    purpose: typeof q["purpose"] === "string" ? q["purpose"] : "",
    adaptedFor: typeof q["adaptedFor"] === "string" ? q["adaptedFor"] : "",
    fallbackDecision: typeof q["fallbackDecision"] === "string" ? q["fallbackDecision"] : ""
  };
}

/**
 * Sanitiza o resultado bruto do LLM em AutonomousDecisions válidas.
 */
function sanitizeAutonomousDecisions(data: Record<string, unknown>): AutonomousDecisions {
  return {
    decisions: Array.isArray(data["decisions"])
      ? data["decisions"].map((d: Record<string, unknown>) => sanitizeDecision(d))
      : DEFAULT_DECISIONS.decisions,
    confidenceLevel: typeof data["confidenceLevel"] === "number"
        && data["confidenceLevel"] >= 0
        && data["confidenceLevel"] <= 1
      ? data["confidenceLevel"]
      : DEFAULT_DECISIONS.confidenceLevel,
    requiresValidation: typeof data["requiresValidation"] === "boolean"
      ? data["requiresValidation"]
      : DEFAULT_DECISIONS.requiresValidation,
    questionsForUser: Array.isArray(data["questionsForUser"])
      ? data["questionsForUser"].map((q: Record<string, unknown>) => sanitizeUserQuestion(q))
      : DEFAULT_DECISIONS.questionsForUser,
    internalRationale: typeof data["internalRationale"] === "string"
        && data["internalRationale"].trim().length > 0
      ? data["internalRationale"]
      : DEFAULT_DECISIONS.internalRationale
  };
}

/**
 * Autonomous Decision Engine — Decisor técnico inteligente.
 *
 * Quando o nível de autonomia é alto, este agente toma todas as decisões
 * técnicas sem incomodar o usuário. Quando baixo, apresenta opções
 * com justificativas para validação.
 */
export class AutonomousDecisionEngine {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  /**
   * Gera decisões autônomas baseadas no contexto completo.
   *
   * @param userInput - Mensagem original do usuário
   * @param profile - Perfil do usuário
   * @param emotions - Contexto emocional
   * @param analysis - Análise técnica do pedido
   * @param strategy - Estratégia de interação (define nível de autonomia)
   * @returns Decisões autônomas com justificativas
   */
  async decide(
    userInput: string,
    profile: UserProfile,
    emotions: EmotionalContext,
    analysis: RichAnalysis,
    strategy: InteractionStrategy
  ): Promise<AutonomousDecisions> {
    try {
      const contextPrompt = `
## PEDIDO DO USUÁRIO:
${userInput}

## PERFIL DO USUÁRIO:
${JSON.stringify(profile, null, 2)}

## CONTEXTO EMOCIONAL:
${JSON.stringify(emotions, null, 2)}

## ANÁLISE TÉCNICA:
- Resumo: ${analysis.summary}
- Complexidade: ${analysis.complexity.level} (${analysis.complexity.score}/10)
- Entidades Core: ${analysis.coreEntities.join(", ")}
- Requisitos Implícitos: ${analysis.implicitRequirements.join("; ")}
- Premissas: ${analysis.assumptions.join("; ")}

## NÍVEL DE AUTONOMIA: ${strategy.autonomyLevel}
(0 = consultivo total, 1 = autônomo total)

## INSTRUÇÕES DE ADAPTAÇÃO:
- Tom: ${strategy.tone}
- Vocabulário: ${strategy.vocabulary}
- Perguntas a evitar: ${strategy.questionsToSkip.join(", ") || "nenhuma"}

Baseado em TODOS esses inputs, tome as decisões técnicas necessárias
para criar a melhor solução possível para este usuário.
`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AUTONOMOUS_DECISION_PROMPT },
          { role: "user", content: contextPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validation = AutonomousDecisionsSchema.safeParse(parsed);
      if (!validation.success) {
        // eslint-disable-next-line no-console
        console.warn("[AutonomousDecision] Validation warning, using sanitizer:", validation.error.issues);
      }

      return sanitizeAutonomousDecisions(parsed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[AutonomousDecision] Error generating decisions:", error);
      return DEFAULT_DECISIONS;
    }
  }
}
