import { describe, it, expect, vi } from "vitest";
import { AutonomousDecisionEngine } from "./autonomous-decision-engine.js";
import type { UserProfile, EmotionalContext, InteractionStrategy } from "../types/transformative-schemas.js";
import type { RichAnalysis } from "../types/rich-schemas.js";

function createMockOpenAI(responseContent: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: responseContent } }],
        }),
      },
    },
  } as unknown as import("openai").default;
}

const mockProfile: UserProfile = {
  knowledgeLevel: "intermediate",
  estimatedAge: "young_adult_18_30",
  communicationStyle: "conversational",
  domain: "web",
  language: "pt-BR",
  culturalContext: "Brazil",
  urgency: "medium",
  accessibilityNeeds: [],
  autonomyPreference: "collaborate",
  confidence: 0.7,
};

const mockEmotions: EmotionalContext = {
  primaryEmotion: "curious",
  emotionalIntensity: 0.5,
  motivationalDrivers: ["learn"],
  fears: [],
  needsEncouragement: false,
  needsSimplification: false,
  needsPatience: false,
  suggestedTone: "professional",
  emotionalStrategy: "Standard approach",
};

const mockAnalysis = {
  summary: "E-commerce platform",
  complexity: { level: "HIGH" as const, score: 8, justification: "many features" },
  coreEntities: ["Product", "Cart", "User"],
  assumptions: ["SPA"],
  implicitRequirements: ["authentication"],
} as RichAnalysis;

const mockStrategy: InteractionStrategy = {
  tone: "collaborative",
  vocabulary: "clear",
  maxMessageLength: "medium",
  useEmojis: false,
  useAnalogies: true,
  useCodeExamples: true,
  autonomyLevel: 0.8,
  questionsToAsk: [],
  questionsToSkip: ["deployment"],
  suggestGamification: false,
  suggestVisualLearning: false,
  suggestStepByStep: false,
  suggestAudioFeedback: false,
  checkpoints: [],
  fallbackStrategy: "defaults",
};

const VALID_DECISIONS_JSON = JSON.stringify({
  decisions: [
    { category: "stack", decision: "Use Next.js", rationale: "SSR + React", alternatives: ["Remix", "Nuxt"], confidence: 0.9, impactIfWrong: "high" },
    { category: "architecture", decision: "Hexagonal", rationale: "Testability", alternatives: ["MVC"], confidence: 0.85, impactIfWrong: "medium" },
  ],
  confidenceLevel: 0.87,
  requiresValidation: false,
  questionsForUser: [
    { question: "Do you need real-time?", purpose: "architecture", adaptedFor: "dev", fallbackDecision: "no real-time" },
  ],
  internalRationale: "User has intermediate knowledge, high autonomy preferred",
});

describe("AutonomousDecisionEngine", () => {
  describe("decide() with valid response", () => {
    it("should return parsed decisions", async () => {
      const client = createMockOpenAI(VALID_DECISIONS_JSON);
      const engine = new AutonomousDecisionEngine(client);
      const result = await engine.decide("Build e-commerce", mockProfile, mockEmotions, mockAnalysis, mockStrategy);
      expect(result.decisions).toHaveLength(2);
      expect(result.decisions[0].category).toBe("stack");
      expect(result.decisions[0].decision).toBe("Use Next.js");
      expect(result.confidenceLevel).toBe(0.87);
      expect(result.questionsForUser).toHaveLength(1);
      expect(result.internalRationale).toContain("intermediate knowledge");
    });
  });

  describe("decide() with invalid values", () => {
    it("should sanitize decisions with invalid fields", async () => {
      const invalid = JSON.stringify({
        decisions: [
          { category: "invalid_cat", decision: 42, rationale: null, alternatives: "not-array", confidence: -1, impactIfWrong: "catastrophic" },
        ],
        confidenceLevel: 99,
        requiresValidation: "yes",
        questionsForUser: [
          { question: 42, purpose: null },
        ],
        internalRationale: "",
      });
      const client = createMockOpenAI(invalid);
      const engine = new AutonomousDecisionEngine(client);
      const result = await engine.decide("test", mockProfile, mockEmotions, mockAnalysis, mockStrategy);
      expect(result.decisions[0].category).toBe("stack");
      expect(result.decisions[0].decision).toBe("Decisão pendente");
      expect(result.decisions[0].rationale).toBe("Sem justificativa");
      expect(result.decisions[0].alternatives).toEqual([]);
      expect(result.decisions[0].confidence).toBe(0.5);
      expect(result.decisions[0].impactIfWrong).toBe("medium");
      expect(result.confidenceLevel).toBe(0.3);
      expect(result.requiresValidation).toBe(true);
      expect(result.questionsForUser[0].question).toBe("");
      expect(result.internalRationale).toContain("modo consultivo");
    });
  });

  describe("decide() on error", () => {
    it("should return default decisions on API error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("Rate limit")),
          },
        },
      } as unknown as import("openai").default;
      const engine = new AutonomousDecisionEngine(client);
      const result = await engine.decide("test", mockProfile, mockEmotions, mockAnalysis, mockStrategy);
      expect(result.decisions).toEqual([]);
      expect(result.confidenceLevel).toBe(0.3);
      expect(result.requiresValidation).toBe(true);
    });
  });
});
