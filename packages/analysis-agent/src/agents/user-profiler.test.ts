import { describe, it, expect, vi } from "vitest";
import { UserProfilerAgent } from "./user-profiler.js";

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

const VALID_PROFILE_JSON = JSON.stringify({
  knowledgeLevel: "advanced",
  estimatedAge: "adult_31_55",
  communicationStyle: "technical",
  domain: "machine learning",
  language: "en",
  culturalContext: "US tech industry",
  urgency: "high",
  accessibilityNeeds: [],
  autonomyPreference: "just_do_it",
  confidence: 0.95,
});

describe("UserProfilerAgent", () => {
  describe("analyze() with valid response", () => {
    it("should return sanitized profile from LLM response", async () => {
      const client = createMockOpenAI(VALID_PROFILE_JSON);
      const agent = new UserProfilerAgent(client);
      const result = await agent.analyze("I need a distributed ML pipeline");
      expect(result.knowledgeLevel).toBe("advanced");
      expect(result.estimatedAge).toBe("adult_31_55");
      expect(result.communicationStyle).toBe("technical");
      expect(result.domain).toBe("machine learning");
      expect(result.urgency).toBe("high");
      expect(result.autonomyPreference).toBe("just_do_it");
      expect(result.confidence).toBe(0.95);
    });
  });

  describe("analyze() with markdown-wrapped JSON", () => {
    it("should strip markdown code fences", async () => {
      const wrapped = "```json\n" + VALID_PROFILE_JSON + "\n```";
      const client = createMockOpenAI(wrapped);
      const agent = new UserProfilerAgent(client);
      const result = await agent.analyze("test");
      expect(result.knowledgeLevel).toBe("advanced");
    });
  });

  describe("analyze() with invalid values", () => {
    it("should sanitize invalid enum values to defaults", async () => {
      const invalid = JSON.stringify({
        knowledgeLevel: "godlike",
        estimatedAge: "unknown",
        communicationStyle: "formal",
        domain: "",
        language: "",
        culturalContext: "",
        urgency: "extreme",
        accessibilityNeeds: "not-an-array",
        autonomyPreference: "do_everything",
        confidence: 5,
      });
      const client = createMockOpenAI(invalid);
      const agent = new UserProfilerAgent(client);
      const result = await agent.analyze("test");
      expect(result.knowledgeLevel).toBe("intermediate");
      expect(result.estimatedAge).toBe("young_adult_18_30");
      expect(result.communicationStyle).toBe("conversational");
      expect(result.domain).toBe("geral");
      expect(result.language).toBe("pt-BR");
      expect(result.urgency).toBe("medium");
      expect(result.accessibilityNeeds).toEqual([]);
      expect(result.autonomyPreference).toBe("collaborate");
      expect(result.confidence).toBe(0.3);
    });
  });

  describe("analyze() with LLM error", () => {
    it("should return default profile on exception", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("API timeout")),
          },
        },
      } as unknown as import("openai").default;
      const agent = new UserProfilerAgent(client);
      const result = await agent.analyze("test");
      expect(result.knowledgeLevel).toBe("intermediate");
      expect(result.confidence).toBe(0.3);
    });
  });

  describe("analyze() with empty response", () => {
    it("should handle null content", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: null } }],
            }),
          },
        },
      } as unknown as import("openai").default;
      const agent = new UserProfilerAgent(client);
      const result = await agent.analyze("test");
      expect(result.knowledgeLevel).toBe("intermediate");
    });
  });

  describe("analyze() with mixed array types in accessibilityNeeds", () => {
    it("should filter non-string items", async () => {
      const json = JSON.stringify({
        knowledgeLevel: "beginner",
        estimatedAge: "child_5_10",
        communicationStyle: "playful",
        domain: "education",
        language: "pt-BR",
        culturalContext: "Brazil",
        urgency: "low",
        accessibilityNeeds: ["screen-reader", 42, null, "large-text"],
        autonomyPreference: "guide_me",
        confidence: 0.7,
      });
      const client = createMockOpenAI(json);
      const agent = new UserProfilerAgent(client);
      const result = await agent.analyze("test");
      expect(result.accessibilityNeeds).toEqual(["screen-reader", "large-text"]);
    });
  });
});
