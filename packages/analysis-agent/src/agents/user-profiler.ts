/**
 * @fileoverview User Profiler Agent — Infere o perfil do usuário sem perguntas diretas.
 *
 * Analisa vocabulário, estrutura, tom e contexto da mensagem para construir
 * um perfil completo que guia toda a interação do sistema.
 *
 * @module agents/user-profiler
 * @version 2.0.0
 */

import OpenAI from "openai";
import { USER_PROFILER_PROMPT } from "../prompts/user-profiler.js";
import {
  UserProfileSchema,
  type UserProfile,
  type KnowledgeLevel,
  type EstimatedAge,
  type CommunicationStyle,
  type AutonomyPreference
} from "../types/transformative-schemas.js";

/**
 * Valores padrão conservadores para perfil de usuário.
 * Usado quando o profiler não consegue inferir com confiança.
 */
const DEFAULT_PROFILE: UserProfile = {
  knowledgeLevel: "intermediate",
  estimatedAge: "young_adult_18_30",
  communicationStyle: "conversational",
  domain: "geral",
  language: "pt-BR",
  culturalContext: "não determinado",
  urgency: "medium",
  accessibilityNeeds: [],
  autonomyPreference: "collaborate",
  confidence: 0.3
};

/** Mapa de valores válidos para sanitização */
const VALID_KNOWLEDGE_LEVELS: KnowledgeLevel[] = ["child", "beginner", "intermediate", "advanced", "expert"];
const VALID_AGES: EstimatedAge[] = ["child_5_10", "teen_11_17", "young_adult_18_30", "adult_31_55", "senior_56_plus"];
const VALID_STYLES: CommunicationStyle[] = ["playful", "simple", "conversational", "professional", "technical"];
const VALID_AUTONOMY: AutonomyPreference[] = ["guide_me", "decide_for_me", "collaborate", "just_do_it"];
const VALID_URGENCY = ["low", "medium", "high", "critical"] as const;

/**
 * Sanitiza o resultado bruto do LLM em um UserProfile válido.
 */
function sanitizeUserProfile(data: Record<string, unknown>): UserProfile {
  return {
    knowledgeLevel: VALID_KNOWLEDGE_LEVELS.includes(data["knowledgeLevel"] as KnowledgeLevel)
      ? (data["knowledgeLevel"] as KnowledgeLevel)
      : DEFAULT_PROFILE.knowledgeLevel,
    estimatedAge: VALID_AGES.includes(data["estimatedAge"] as EstimatedAge)
      ? (data["estimatedAge"] as EstimatedAge)
      : DEFAULT_PROFILE.estimatedAge,
    communicationStyle: VALID_STYLES.includes(data["communicationStyle"] as CommunicationStyle)
      ? (data["communicationStyle"] as CommunicationStyle)
      : DEFAULT_PROFILE.communicationStyle,
    domain: typeof data["domain"] === "string" && data["domain"].trim().length > 0
      ? data["domain"]
      : DEFAULT_PROFILE.domain,
    language: typeof data["language"] === "string" && data["language"].trim().length > 0
      ? data["language"]
      : DEFAULT_PROFILE.language,
    culturalContext: typeof data["culturalContext"] === "string" && data["culturalContext"].trim().length > 0
      ? data["culturalContext"]
      : DEFAULT_PROFILE.culturalContext,
    urgency: (VALID_URGENCY as readonly string[]).includes(data["urgency"] as string)
      ? (data["urgency"] as UserProfile["urgency"])
      : DEFAULT_PROFILE.urgency,
    accessibilityNeeds: Array.isArray(data["accessibilityNeeds"])
      ? data["accessibilityNeeds"].filter((item): item is string => typeof item === "string")
      : DEFAULT_PROFILE.accessibilityNeeds,
    autonomyPreference: VALID_AUTONOMY.includes(data["autonomyPreference"] as AutonomyPreference)
      ? (data["autonomyPreference"] as AutonomyPreference)
      : DEFAULT_PROFILE.autonomyPreference,
    confidence: typeof data["confidence"] === "number" && data["confidence"] >= 0 && data["confidence"] <= 1
      ? data["confidence"]
      : DEFAULT_PROFILE.confidence
  };
}

/**
 * User Profiler Agent — Constrói perfil do usuário por inferência.
 *
 * Este agente analisa a mensagem do usuário e infere seu perfil completo
 * sem fazer perguntas diretas. Opera na Camada Humana do pipeline.
 */
export class UserProfilerAgent {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  /**
   * Analisa a mensagem do usuário e retorna um perfil completo.
   *
   * @param userInput - A mensagem original do usuário
   * @returns Perfil completo do usuário inferido pela IA
   */
  async analyze(userInput: string): Promise<UserProfile> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: USER_PROFILER_PROMPT },
          { role: "user", content: userInput }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validation = UserProfileSchema.safeParse(parsed);
      if (!validation.success) {
        // eslint-disable-next-line no-console
        console.warn("[UserProfiler] Validation warning, using sanitizer:", validation.error.issues);
      }

      return sanitizeUserProfile(parsed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[UserProfiler] Error analyzing user profile:", error);
      return DEFAULT_PROFILE;
    }
  }
}
