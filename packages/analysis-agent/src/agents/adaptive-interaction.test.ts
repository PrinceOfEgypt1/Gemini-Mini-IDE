import { describe, it, expect, vi } from "vitest";
import { AdaptiveInteractionAgent } from "./adaptive-interaction.js";
import type { UserProfile, EmotionalContext } from "../types/transformative-schemas.js";

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
  knowledgeLevel: "beginner",
  estimatedAge: "teen_11_17",
  communicationStyle: "playful",
  domain: "games",
  language: "pt-BR",
  culturalContext: "Brazil",
  urgency: "low",
  accessibilityNeeds: [],
  autonomyPreference: "guide_me",
  confidence: 0.8,
};

const mockEmotions: EmotionalContext = {
  primaryEmotion: "enthusiastic",
  emotionalIntensity: 0.7,
  motivationalDrivers: ["fun"],
  fears: [],
  needsEncouragement: true,
  needsSimplification: true,
  needsPatience: false,
  suggestedTone: "playful",
  emotionalStrategy: "Keep it fun",
};

const VALID_STRATEGY_JSON = JSON.stringify({
  tone: "playful and fun",
  vocabulary: "simple words",
  maxMessageLength: "short",
  useEmojis: true,
  useAnalogies: true,
  useCodeExamples: false,
  autonomyLevel: 0.3,
  questionsToAsk: [
    { question: "What game?", purpose: "understand", adaptedFor: "teen", fallbackDecision: "platformer", priority: "essential" },
  ],
  questionsToSkip: ["tech stack"],
  suggestGamification: true,
  suggestVisualLearning: true,
  suggestStepByStep: true,
  suggestAudioFeedback: false,
  checkpoints: ["after design"],
  fallbackStrategy: "use defaults",
});

describe("AdaptiveInteractionAgent", () => {
  describe("createStrategy() with valid response", () => {
    it("should return parsed strategy", async () => {
      const client = createMockOpenAI(VALID_STRATEGY_JSON);
      const agent = new AdaptiveInteractionAgent(client);
      const result = await agent.createStrategy(mockProfile, mockEmotions);
      expect(result.tone).toBe("playful and fun");
      expect(result.useEmojis).toBe(true);
      expect(result.autonomyLevel).toBe(0.3);
      expect(result.questionsToAsk).toHaveLength(1);
      expect(result.questionsToAsk[0].priority).toBe("essential");
    });
  });

  describe("createStrategy() with invalid values", () => {
    it("should sanitize all invalid fields to defaults", async () => {
      const invalid = JSON.stringify({
        tone: "",
        vocabulary: "",
        maxMessageLength: "huge",
        useEmojis: "yes",
        useAnalogies: "no",
        useCodeExamples: "maybe",
        autonomyLevel: 5,
        questionsToAsk: "not-array",
        questionsToSkip: [42, null],
        suggestGamification: 1,
        suggestVisualLearning: 0,
        suggestStepByStep: "true",
        suggestAudioFeedback: "false",
        checkpoints: [1, 2, 3],
        fallbackStrategy: "",
      });
      const client = createMockOpenAI(invalid);
      const agent = new AdaptiveInteractionAgent(client);
      const result = await agent.createStrategy(mockProfile, mockEmotions);
      expect(result.tone).toBe("colaborativo e respeitoso");
      expect(result.vocabulary).toBe("claro e acessível");
      expect(result.maxMessageLength).toBe("medium");
      expect(result.useEmojis).toBe(false);
      expect(result.autonomyLevel).toBe(0.5);
      expect(result.questionsToAsk).toEqual([]);
      expect(result.questionsToSkip).toEqual([]);
      expect(result.fallbackStrategy).toContain("Usar valores padrão");
    });
  });

  describe("createStrategy() with questions containing invalid priority", () => {
    it("should default priority to important", async () => {
      const json = JSON.stringify({
        tone: "test",
        vocabulary: "test",
        maxMessageLength: "short",
        useEmojis: false,
        useAnalogies: false,
        useCodeExamples: false,
        autonomyLevel: 0.5,
        questionsToAsk: [
          { question: "Q1", purpose: "P1", adaptedFor: "all", fallbackDecision: "F1", priority: "invalid" },
        ],
        questionsToSkip: [],
        suggestGamification: false,
        suggestVisualLearning: false,
        suggestStepByStep: false,
        suggestAudioFeedback: false,
        checkpoints: [],
        fallbackStrategy: "default",
      });
      const client = createMockOpenAI(json);
      const agent = new AdaptiveInteractionAgent(client);
      const result = await agent.createStrategy(mockProfile, mockEmotions);
      expect(result.questionsToAsk[0].priority).toBe("important");
    });
  });

  describe("createStrategy() on error", () => {
    it("should return default strategy on API error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("Timeout")),
          },
        },
      } as unknown as import("openai").default;
      const agent = new AdaptiveInteractionAgent(client);
      const result = await agent.createStrategy(mockProfile, mockEmotions);
      expect(result.tone).toBe("colaborativo e respeitoso");
      expect(result.suggestStepByStep).toBe(true);
    });
  });
});
