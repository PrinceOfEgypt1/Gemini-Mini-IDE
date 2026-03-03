/**
 * @fileoverview Experience Designer Agent — Cria experiências transformadoras.
 *
 * Transforma requisitos em experiências que encantam, educam e impactam.
 * Pensa além de funcionalidades — projeta jornadas emocionais completas.
 *
 * @module agents/experience-designer
 * @version 2.0.0
 */

import OpenAI from "openai";
import { EXPERIENCE_DESIGN_PROMPT } from "../prompts/experience-design.js";
import {
  ExperienceDesignSchema,
  type ExperienceDesign,
  type JourneyPhase,
  type GamificationElement,
  type AdaptiveRule,
  type ContentStrategy,
  type UserProfile,
  type EmotionalContext,
  type AutonomousDecisions
} from "../types/transformative-schemas.js";

/**
 * Design de experiência padrão (genérico).
 */
const DEFAULT_EXPERIENCE: ExperienceDesign = {
  experienceVision: "Uma solução funcional e intuitiva que atende às necessidades do usuário.",
  targetEmotion: "satisfação",
  userJourney: [
    {
      name: "Início",
      objective: "Apresentar a solução ao usuário",
      emotionalGoal: "Sentir-se acolhido",
      interactions: ["Tela de boas-vindas"],
      successCriteria: ["Usuário entende o propósito da aplicação"],
      failsafeActions: ["Mostrar tutorial básico"]
    }
  ],
  gamificationElements: [],
  adaptiveRules: [],
  accessibilityFeatures: ["Contraste adequado", "Navegação por teclado"],
  safetyMeasures: ["Sem coleta desnecessária de dados"],
  contentStrategy: {
    tone: "amigável e claro",
    visualStyle: "moderno e limpo",
    audioElements: [],
    interactiveElements: ["Botões com feedback visual"],
    culturalAdaptations: []
  },
  emotionalDesignPrinciples: ["Simplicidade", "Clareza", "Feedback positivo"]
};

/**
 * Sanitiza uma fase da jornada.
 */
function sanitizeJourneyPhase(phase: Record<string, unknown>): JourneyPhase {
  return {
    name: typeof phase["name"] === "string" ? phase["name"] : "Fase",
    objective: typeof phase["objective"] === "string" ? phase["objective"] : "",
    emotionalGoal: typeof phase["emotionalGoal"] === "string" ? phase["emotionalGoal"] : "",
    interactions: Array.isArray(phase["interactions"])
      ? phase["interactions"].filter((i): i is string => typeof i === "string")
      : [],
    successCriteria: Array.isArray(phase["successCriteria"])
      ? phase["successCriteria"].filter((s): s is string => typeof s === "string")
      : [],
    failsafeActions: Array.isArray(phase["failsafeActions"])
      ? phase["failsafeActions"].filter((f): f is string => typeof f === "string")
      : []
  };
}

/**
 * Sanitiza um elemento de gamificação.
 */
function sanitizeGamificationElement(el: Record<string, unknown>): GamificationElement {
  const validTypes = ["reward", "progress", "challenge", "social", "narrative"] as const;
  return {
    type: validTypes.includes(el["type"] as typeof validTypes[number])
      ? (el["type"] as GamificationElement["type"])
      : "reward",
    description: typeof el["description"] === "string" ? el["description"] : "",
    trigger: typeof el["trigger"] === "string" ? el["trigger"] : "",
    psychologicalEffect: typeof el["psychologicalEffect"] === "string" ? el["psychologicalEffect"] : ""
  };
}

/**
 * Sanitiza uma regra adaptativa.
 */
function sanitizeAdaptiveRule(rule: Record<string, unknown>): AdaptiveRule {
  return {
    condition: typeof rule["condition"] === "string" ? rule["condition"] : "",
    action: typeof rule["action"] === "string" ? rule["action"] : "",
    rationale: typeof rule["rationale"] === "string" ? rule["rationale"] : ""
  };
}

/**
 * Sanitiza a estratégia de conteúdo.
 */
function sanitizeContentStrategy(cs: Record<string, unknown>): ContentStrategy {
  return {
    tone: typeof cs["tone"] === "string" ? cs["tone"] : DEFAULT_EXPERIENCE.contentStrategy.tone,
    visualStyle: typeof cs["visualStyle"] === "string" ? cs["visualStyle"] : DEFAULT_EXPERIENCE.contentStrategy.visualStyle,
    audioElements: Array.isArray(cs["audioElements"])
      ? cs["audioElements"].filter((a): a is string => typeof a === "string")
      : [],
    interactiveElements: Array.isArray(cs["interactiveElements"])
      ? cs["interactiveElements"].filter((i): i is string => typeof i === "string")
      : [],
    culturalAdaptations: Array.isArray(cs["culturalAdaptations"])
      ? cs["culturalAdaptations"].filter((c): c is string => typeof c === "string")
      : []
  };
}

/**
 * Sanitiza o resultado bruto do LLM em um ExperienceDesign válido.
 */
function sanitizeExperienceDesign(data: Record<string, unknown>): ExperienceDesign {
  return {
    experienceVision: typeof data["experienceVision"] === "string"
        && data["experienceVision"].trim().length > 0
      ? data["experienceVision"]
      : DEFAULT_EXPERIENCE.experienceVision,
    targetEmotion: typeof data["targetEmotion"] === "string"
        && data["targetEmotion"].trim().length > 0
      ? data["targetEmotion"]
      : DEFAULT_EXPERIENCE.targetEmotion,
    userJourney: Array.isArray(data["userJourney"])
      ? data["userJourney"].map((p: Record<string, unknown>) => sanitizeJourneyPhase(p))
      : DEFAULT_EXPERIENCE.userJourney,
    gamificationElements: Array.isArray(data["gamificationElements"])
      ? data["gamificationElements"].map((el: Record<string, unknown>) => sanitizeGamificationElement(el))
      : DEFAULT_EXPERIENCE.gamificationElements,
    adaptiveRules: Array.isArray(data["adaptiveRules"])
      ? data["adaptiveRules"].map((r: Record<string, unknown>) => sanitizeAdaptiveRule(r))
      : DEFAULT_EXPERIENCE.adaptiveRules,
    accessibilityFeatures: Array.isArray(data["accessibilityFeatures"])
      ? data["accessibilityFeatures"].filter((f): f is string => typeof f === "string")
      : DEFAULT_EXPERIENCE.accessibilityFeatures,
    safetyMeasures: Array.isArray(data["safetyMeasures"])
      ? data["safetyMeasures"].filter((s): s is string => typeof s === "string")
      : DEFAULT_EXPERIENCE.safetyMeasures,
    contentStrategy: typeof data["contentStrategy"] === "object" && data["contentStrategy"] !== null
      ? sanitizeContentStrategy(data["contentStrategy"] as Record<string, unknown>)
      : DEFAULT_EXPERIENCE.contentStrategy,
    emotionalDesignPrinciples: Array.isArray(data["emotionalDesignPrinciples"])
      ? data["emotionalDesignPrinciples"].filter((p): p is string => typeof p === "string")
      : DEFAULT_EXPERIENCE.emotionalDesignPrinciples
  };
}

/**
 * Experience Designer Agent — Arquiteto de experiências transformadoras.
 *
 * Não apenas lista funcionalidades — projeta COMO o usuário vai sentir
 * cada interação, criando jornadas emocionais completas.
 */
export class ExperienceDesignerAgent {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  /**
   * Projeta a experiência completa baseada no contexto humano.
   *
   * @param userInput - Mensagem original do usuário
   * @param profile - Perfil do usuário
   * @param emotions - Contexto emocional
   * @param decisions - Decisões autônomas já tomadas
   * @returns Design de experiência completo
   */
  async design(
    userInput: string,
    profile: UserProfile,
    emotions: EmotionalContext,
    decisions: AutonomousDecisions
  ): Promise<ExperienceDesign> {
    try {
      const decisionsText = decisions.decisions
        .map(d => `- [${d.category}] ${d.decision} (Confiança: ${d.confidence})`)
        .join("\n");

      const contextPrompt = `
## PEDIDO DO USUÁRIO:
${userInput}

## PERFIL DO USUÁRIO:
- Nível de conhecimento: ${profile.knowledgeLevel}
- Faixa etária: ${profile.estimatedAge}
- Estilo de comunicação: ${profile.communicationStyle}
- Domínio: ${profile.domain}
- Idioma: ${profile.language}
- Contexto cultural: ${profile.culturalContext}
- Necessidades de acessibilidade: ${profile.accessibilityNeeds.join(", ") || "nenhuma identificada"}

## CONTEXTO EMOCIONAL:
- Emoção primária: ${emotions.primaryEmotion} (intensidade: ${emotions.emotionalIntensity})
- Motivações: ${emotions.motivationalDrivers.join(", ")}
- Medos: ${emotions.fears.join(", ") || "nenhum identificado"}
- Tom sugerido: ${emotions.suggestedTone}
- Estratégia emocional: ${emotions.emotionalStrategy}

## DECISÕES TÉCNICAS JÁ TOMADAS:
${decisionsText || "Nenhuma decisão autônoma tomada ainda."}

Projete a EXPERIÊNCIA completa que esta solução deve oferecer.
Pense além de funcionalidades — projete como o usuário vai se SENTIR.
`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EXPERIENCE_DESIGN_PROMPT },
          { role: "user", content: contextPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validation = ExperienceDesignSchema.safeParse(parsed);
      if (!validation.success) {
        // eslint-disable-next-line no-console
        console.warn("[ExperienceDesigner] Validation warning, using sanitizer:", validation.error.issues);
      }

      return sanitizeExperienceDesign(parsed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[ExperienceDesigner] Error designing experience:", error);
      return DEFAULT_EXPERIENCE;
    }
  }
}
