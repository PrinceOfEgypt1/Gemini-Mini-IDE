import { describe, it, expect, vi } from "vitest";
import { ExperienceDesignerAgent } from "./experience-designer.js";
import type { UserProfile, EmotionalContext, AutonomousDecisions } from "../types/transformative-schemas.js";

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
  knowledgeLevel: "child",
  estimatedAge: "child_5_10",
  communicationStyle: "playful",
  domain: "education",
  language: "pt-BR",
  culturalContext: "Brazil",
  urgency: "low",
  accessibilityNeeds: ["large-text"],
  autonomyPreference: "guide_me",
  confidence: 0.9,
};

const mockEmotions: EmotionalContext = {
  primaryEmotion: "insecure",
  emotionalIntensity: 0.6,
  motivationalDrivers: ["learn to read"],
  fears: ["failure", "being judged"],
  needsEncouragement: true,
  needsSimplification: true,
  needsPatience: true,
  suggestedTone: "encouraging",
  emotionalStrategy: "Be gentle and supportive",
};

const mockDecisions: AutonomousDecisions = {
  decisions: [
    { category: "ux", decision: "Gamified interface", rationale: "Child audience", alternatives: [], confidence: 0.9, impactIfWrong: "high" },
  ],
  confidenceLevel: 0.9,
  requiresValidation: false,
  questionsForUser: [],
  internalRationale: "Child needs gamification",
};

const VALID_DESIGN_JSON = JSON.stringify({
  experienceVision: "A magical learning journey",
  targetEmotion: "wonder",
  userJourney: [
    { name: "Welcome", objective: "Feel safe", emotionalGoal: "comfort", interactions: ["greeting"], successCriteria: ["smiles"], failsafeActions: ["simplify"] },
    { name: "Learn", objective: "First lesson", emotionalGoal: "achievement", interactions: ["game"], successCriteria: ["completes task"], failsafeActions: ["hint"] },
  ],
  gamificationElements: [
    { type: "reward", description: "Star badge", trigger: "complete lesson", psychologicalEffect: "motivation" },
    { type: "progress", description: "Progress bar", trigger: "each step", psychologicalEffect: "sense of advancement" },
  ],
  adaptiveRules: [
    { condition: "3 errors", action: "simplify", rationale: "reduce frustration" },
  ],
  accessibilityFeatures: ["large text", "high contrast", "audio narration"],
  safetyMeasures: ["no personal data", "parent approval"],
  contentStrategy: { tone: "warm and playful", visualStyle: "colorful cartoon", audioElements: ["background music"], interactiveElements: ["drag-and-drop"], culturalAdaptations: ["BR Portuguese"] },
  emotionalDesignPrinciples: ["Safety first", "Celebrate every win", "Never punish mistakes"],
});

describe("ExperienceDesignerAgent", () => {
  describe("design() with valid response", () => {
    it("should return parsed experience design", async () => {
      const client = createMockOpenAI(VALID_DESIGN_JSON);
      const agent = new ExperienceDesignerAgent(client);
      const result = await agent.design("app to help kids read", mockProfile, mockEmotions, mockDecisions);
      expect(result.experienceVision).toBe("A magical learning journey");
      expect(result.targetEmotion).toBe("wonder");
      expect(result.userJourney).toHaveLength(2);
      expect(result.gamificationElements).toHaveLength(2);
      expect(result.gamificationElements[0].type).toBe("reward");
      expect(result.adaptiveRules).toHaveLength(1);
      expect(result.accessibilityFeatures).toContain("large text");
      expect(result.contentStrategy.tone).toBe("warm and playful");
      expect(result.emotionalDesignPrinciples).toContain("Safety first");
    });
  });

  describe("design() with invalid values", () => {
    it("should sanitize all invalid fields to defaults", async () => {
      const invalid = JSON.stringify({
        experienceVision: "",
        targetEmotion: "",
        userJourney: [
          { name: 42, objective: null, emotionalGoal: undefined, interactions: "not-array", successCriteria: 5, failsafeActions: null },
        ],
        gamificationElements: [
          { type: "invalid", description: 42, trigger: null, psychologicalEffect: undefined },
        ],
        adaptiveRules: [
          { condition: 42, action: null, rationale: undefined },
        ],
        accessibilityFeatures: [1, "valid-feature", null],
        safetyMeasures: "not-array",
        contentStrategy: {
          tone: null,
          visualStyle: null,
          audioElements: "not-array",
          interactiveElements: [42, "button"],
          culturalAdaptations: null,
        },
        emotionalDesignPrinciples: [42, "valid-principle"],
      });
      const client = createMockOpenAI(invalid);
      const agent = new ExperienceDesignerAgent(client);
      const result = await agent.design("test", mockProfile, mockEmotions, mockDecisions);
      expect(result.experienceVision).toContain("funcional e intuitiva");
      expect(result.targetEmotion).toBe("satisfação");
      expect(result.userJourney[0].name).toBe("Fase");
      expect(result.userJourney[0].interactions).toEqual([]);
      expect(result.gamificationElements[0].type).toBe("reward");
      expect(result.gamificationElements[0].description).toBe("");
      expect(result.adaptiveRules[0].condition).toBe("");
      expect(result.accessibilityFeatures).toEqual(["valid-feature"]);
      expect(result.safetyMeasures).toEqual(["Sem coleta desnecessária de dados"]);
      expect(result.contentStrategy.tone).toBe("amigável e claro");
      expect(result.contentStrategy.interactiveElements).toEqual(["button"]);
      expect(result.emotionalDesignPrinciples).toEqual(["valid-principle"]);
    });
  });

  describe("design() with null contentStrategy", () => {
    it("should use default content strategy", async () => {
      const json = JSON.stringify({
        experienceVision: "Test",
        targetEmotion: "joy",
        userJourney: [],
        gamificationElements: [],
        adaptiveRules: [],
        accessibilityFeatures: [],
        safetyMeasures: [],
        contentStrategy: null,
        emotionalDesignPrinciples: [],
      });
      const client = createMockOpenAI(json);
      const agent = new ExperienceDesignerAgent(client);
      const result = await agent.design("test", mockProfile, mockEmotions, mockDecisions);
      expect(result.contentStrategy.tone).toBe("amigável e claro");
    });
  });

  describe("design() on error", () => {
    it("should return default design on API error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("Timeout")),
          },
        },
      } as unknown as import("openai").default;
      const agent = new ExperienceDesignerAgent(client);
      const result = await agent.design("test", mockProfile, mockEmotions, mockDecisions);
      expect(result.experienceVision).toContain("funcional e intuitiva");
      expect(result.userJourney).toHaveLength(1);
      expect(result.userJourney[0].name).toBe("Início");
    });
  });
});
