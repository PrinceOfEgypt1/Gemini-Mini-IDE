/**
 * @fileoverview Adaptive Interaction Agent — Define estratégia de comunicação.
 *
 * Traduz o perfil do usuário e seu contexto emocional em uma estratégia
 * de comunicação concreta que guia todos os outros agentes.
 *
 * @module agents/adaptive-interaction
 * @version 2.0.0
 */

import OpenAI from "openai";
import { ADAPTIVE_INTERACTION_PROMPT } from "../prompts/adaptive-interaction.js";
import {
  InteractionStrategySchema,
  type InteractionStrategy,
  type InteractionQuestion,
  type UserProfile,
  type EmotionalContext
} from "../types/transformative-schemas.js";

/**
 * Estratégia de interação padrão (conservadora).
 */
const DEFAULT_STRATEGY: InteractionStrategy = {
  tone: "colaborativo e respeitoso",
  vocabulary: "claro e acessível",
  maxMessageLength: "medium",
  useEmojis: false,
  useAnalogies: true,
  useCodeExamples: false,
  autonomyLevel: 0.5,
  questionsToAsk: [],
  questionsToSkip: [],
  suggestGamification: false,
  suggestVisualLearning: false,
  suggestStepByStep: true,
  suggestAudioFeedback: false,
  checkpoints: ["Após definição de requisitos", "Após proposta de arquitetura"],
  fallbackStrategy: "Usar valores padrão conservadores e prosseguir com o pipeline"
};

/**
 * Sanitiza uma pergunta de interação.
 */
function sanitizeQuestion(q: Record<string, unknown>): InteractionQuestion {
  const validPriorities = ["essential", "important", "nice_to_have"] as const;
  const priority = validPriorities.includes(q["priority"] as typeof validPriorities[number])
    ? (q["priority"] as InteractionQuestion["priority"])
    : "important";

  return {
    question: typeof q["question"] === "string" ? q["question"] : "",
    purpose: typeof q["purpose"] === "string" ? q["purpose"] : "",
    adaptedFor: typeof q["adaptedFor"] === "string" ? q["adaptedFor"] : "",
    fallbackDecision: typeof q["fallbackDecision"] === "string" ? q["fallbackDecision"] : "",
    priority
  };
}

/**
 * Sanitiza o resultado bruto do LLM em uma InteractionStrategy válida.
 */
function sanitizeInteractionStrategy(data: Record<string, unknown>): InteractionStrategy {
  const validLengths = ["short", "medium", "detailed"] as const;

  return {
    tone: typeof data["tone"] === "string" && data["tone"].trim().length > 0
      ? data["tone"]
      : DEFAULT_STRATEGY.tone,
    vocabulary: typeof data["vocabulary"] === "string" && data["vocabulary"].trim().length > 0
      ? data["vocabulary"]
      : DEFAULT_STRATEGY.vocabulary,
    maxMessageLength: validLengths.includes(data["maxMessageLength"] as typeof validLengths[number])
      ? (data["maxMessageLength"] as InteractionStrategy["maxMessageLength"])
      : DEFAULT_STRATEGY.maxMessageLength,
    useEmojis: typeof data["useEmojis"] === "boolean"
      ? data["useEmojis"]
      : DEFAULT_STRATEGY.useEmojis,
    useAnalogies: typeof data["useAnalogies"] === "boolean"
      ? data["useAnalogies"]
      : DEFAULT_STRATEGY.useAnalogies,
    useCodeExamples: typeof data["useCodeExamples"] === "boolean"
      ? data["useCodeExamples"]
      : DEFAULT_STRATEGY.useCodeExamples,
    autonomyLevel: typeof data["autonomyLevel"] === "number"
        && data["autonomyLevel"] >= 0
        && data["autonomyLevel"] <= 1
      ? data["autonomyLevel"]
      : DEFAULT_STRATEGY.autonomyLevel,
    questionsToAsk: Array.isArray(data["questionsToAsk"])
      ? data["questionsToAsk"].map((q: Record<string, unknown>) => sanitizeQuestion(q))
      : DEFAULT_STRATEGY.questionsToAsk,
    questionsToSkip: Array.isArray(data["questionsToSkip"])
      ? data["questionsToSkip"].filter((item): item is string => typeof item === "string")
      : DEFAULT_STRATEGY.questionsToSkip,
    suggestGamification: typeof data["suggestGamification"] === "boolean"
      ? data["suggestGamification"]
      : DEFAULT_STRATEGY.suggestGamification,
    suggestVisualLearning: typeof data["suggestVisualLearning"] === "boolean"
      ? data["suggestVisualLearning"]
      : DEFAULT_STRATEGY.suggestVisualLearning,
    suggestStepByStep: typeof data["suggestStepByStep"] === "boolean"
      ? data["suggestStepByStep"]
      : DEFAULT_STRATEGY.suggestStepByStep,
    suggestAudioFeedback: typeof data["suggestAudioFeedback"] === "boolean"
      ? data["suggestAudioFeedback"]
      : DEFAULT_STRATEGY.suggestAudioFeedback,
    checkpoints: Array.isArray(data["checkpoints"])
      ? data["checkpoints"].filter((item): item is string => typeof item === "string")
      : DEFAULT_STRATEGY.checkpoints,
    fallbackStrategy: typeof data["fallbackStrategy"] === "string"
        && data["fallbackStrategy"].trim().length > 0
      ? data["fallbackStrategy"]
      : DEFAULT_STRATEGY.fallbackStrategy
  };
}

/**
 * Adaptive Interaction Agent — Estrategista de comunicação.
 *
 * Recebe o perfil e estado emocional do usuário, e produz uma estratégia
 * de interação detalhada que guia todos os agentes do sistema.
 */
export class AdaptiveInteractionAgent {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  /**
   * Cria a estratégia de interação baseada no perfil e emoção do usuário.
   *
   * @param profile - Perfil do usuário inferido pelo User Profiler
   * @param emotions - Contexto emocional detectado pelo Emotional Intelligence Agent
   * @returns Estratégia de interação detalhada
   */
  async createStrategy(
    profile: UserProfile,
    emotions: EmotionalContext
  ): Promise<InteractionStrategy> {
    try {
      const contextPrompt = `
## PERFIL DO USUÁRIO:
${JSON.stringify(profile, null, 2)}

## CONTEXTO EMOCIONAL:
${JSON.stringify(emotions, null, 2)}

Com base neste perfil e contexto emocional, defina a estratégia de interação ideal.
`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ADAPTIVE_INTERACTION_PROMPT },
          { role: "user", content: contextPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validation = InteractionStrategySchema.safeParse(parsed);
      if (!validation.success) {
        // eslint-disable-next-line no-console
        console.warn("[AdaptiveInteraction] Validation warning, using sanitizer:", validation.error.issues);
      }

      return sanitizeInteractionStrategy(parsed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[AdaptiveInteraction] Error creating strategy:", error);
      return DEFAULT_STRATEGY;
    }
  }
}
