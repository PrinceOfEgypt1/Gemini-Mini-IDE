/**
 * @fileoverview Emotional Intelligence Agent — Detecta o estado emocional do usuário.
 *
 * Analisa indicadores emocionais no texto para produzir um mapa emocional
 * que guia o tom e a abordagem de toda a interação.
 *
 * @module agents/emotional-intelligence
 * @version 2.0.0
 */

import OpenAI from "openai";
import { EMOTIONAL_INTELLIGENCE_PROMPT } from "../prompts/emotional-intelligence.js";
import {
  EmotionalContextSchema,
  type EmotionalContext,
  type PrimaryEmotion,
  type SuggestedTone
} from "../types/transformative-schemas.js";

/**
 * Contexto emocional padrão (neutro) para fallback.
 */
const DEFAULT_EMOTIONAL_CONTEXT: EmotionalContext = {
  primaryEmotion: "neutral",
  emotionalIntensity: 0.3,
  motivationalDrivers: ["resolver problema"],
  fears: [],
  needsEncouragement: false,
  needsSimplification: false,
  needsPatience: false,
  suggestedTone: "professional",
  emotionalStrategy: "Abordagem neutra e profissional, adaptando conforme a interação evolui."
};

/** Valores válidos para emoções */
const VALID_EMOTIONS: PrimaryEmotion[] = [
  "frustrated", "insecure", "enthusiastic", "confused",
  "anxious", "curious", "sad", "determined", "neutral"
];

/** Valores válidos para tom */
const VALID_TONES: SuggestedTone[] = [
  "encouraging", "playful", "professional", "empathetic",
  "direct", "patient", "celebratory"
];

/**
 * Sanitiza o resultado bruto do LLM em um EmotionalContext válido.
 */
function sanitizeEmotionalContext(data: Record<string, unknown>): EmotionalContext {
  return {
    primaryEmotion: VALID_EMOTIONS.includes(data["primaryEmotion"] as PrimaryEmotion)
      ? (data["primaryEmotion"] as PrimaryEmotion)
      : DEFAULT_EMOTIONAL_CONTEXT.primaryEmotion,
    emotionalIntensity: typeof data["emotionalIntensity"] === "number"
        && data["emotionalIntensity"] >= 0
        && data["emotionalIntensity"] <= 1
      ? data["emotionalIntensity"]
      : DEFAULT_EMOTIONAL_CONTEXT.emotionalIntensity,
    motivationalDrivers: Array.isArray(data["motivationalDrivers"])
      ? data["motivationalDrivers"].filter((item): item is string => typeof item === "string")
      : DEFAULT_EMOTIONAL_CONTEXT.motivationalDrivers,
    fears: Array.isArray(data["fears"])
      ? data["fears"].filter((item): item is string => typeof item === "string")
      : DEFAULT_EMOTIONAL_CONTEXT.fears,
    needsEncouragement: typeof data["needsEncouragement"] === "boolean"
      ? data["needsEncouragement"]
      : DEFAULT_EMOTIONAL_CONTEXT.needsEncouragement,
    needsSimplification: typeof data["needsSimplification"] === "boolean"
      ? data["needsSimplification"]
      : DEFAULT_EMOTIONAL_CONTEXT.needsSimplification,
    needsPatience: typeof data["needsPatience"] === "boolean"
      ? data["needsPatience"]
      : DEFAULT_EMOTIONAL_CONTEXT.needsPatience,
    suggestedTone: VALID_TONES.includes(data["suggestedTone"] as SuggestedTone)
      ? (data["suggestedTone"] as SuggestedTone)
      : DEFAULT_EMOTIONAL_CONTEXT.suggestedTone,
    emotionalStrategy: typeof data["emotionalStrategy"] === "string"
        && data["emotionalStrategy"].trim().length > 0
      ? data["emotionalStrategy"]
      : DEFAULT_EMOTIONAL_CONTEXT.emotionalStrategy
  };
}

/**
 * Emotional Intelligence Agent — Detecta e interpreta estado emocional.
 *
 * Opera na Camada Humana do pipeline, produzindo um mapa emocional
 * que guia como todos os outros agentes interagem com o usuário.
 */
export class EmotionalIntelligenceAgent {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  /**
   * Analisa o estado emocional do usuário a partir de sua mensagem.
   *
   * @param userInput - A mensagem original do usuário
   * @returns Contexto emocional completo
   */
  async analyze(userInput: string): Promise<EmotionalContext> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EMOTIONAL_INTELLIGENCE_PROMPT },
          { role: "user", content: userInput }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validation = EmotionalContextSchema.safeParse(parsed);
      if (!validation.success) {
        // eslint-disable-next-line no-console
        console.warn("[EmotionalIntel] Validation warning, using sanitizer:", validation.error.issues);
      }

      return sanitizeEmotionalContext(parsed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[EmotionalIntel] Error analyzing emotional context:", error);
      return DEFAULT_EMOTIONAL_CONTEXT;
    }
  }
}
